import { redis, KEYS } from "@/lib/redis";

export interface AnswerPayload {
  email: string;
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
  answeredAt: number;
}

/**
 * Atomically: refuse if USER_ANSWER key exists; else SET it and merge into ANSWERS array.
 * Fixes lost leaderboard rows when many students submit at once, and races on first submit.
 */
const SUBMIT_ANSWER_LUA = `
local answerKey = KEYS[1]
local answersKey = KEYS[2]
local answerJson = ARGV[1]

if redis.call('EXISTS', answerKey) == 1 then
  return 0
end

redis.call('SET', answerKey, answerJson)
local answer = cjson.decode(answerJson)

local raw = redis.call('GET', answersKey)
local list = {}
if type(raw) == 'string' and #raw > 0 then
  local ok, decoded = pcall(cjson.decode, raw)
  if ok and type(decoded) == 'table' then
    list = decoded
  end
end

local found = false
for i, a in ipairs(list) do
  if a.email == answer.email and a.questionIndex == answer.questionIndex then
    list[i] = answer
    found = true
    break
  end
end

if not found then
  table.insert(list, answer)
end

redis.call('SET', answersKey, cjson.encode(list))
return 1
`;

export async function atomicSubmitAnswer(
  teamId: string,
  normalizedEmail: string,
  answer: AnswerPayload,
): Promise<"success" | "conflict" | "failed"> {
  const answerKey = KEYS.USER_ANSWER(
    teamId,
    normalizedEmail,
    answer.questionIndex,
  );
  const answersKey = KEYS.ANSWERS(teamId);
  const json = JSON.stringify(answer);
  let retries = 5;

  while (retries > 0) {
    try {
      const result = await redis.eval(SUBMIT_ANSWER_LUA, [answerKey, answersKey], [
        json,
      ]);
      const n = typeof result === "number" ? result : Number(result);
      if (n === 1) return "success";
      if (n === 0) return "conflict";
      return "failed";
    } catch (error) {
      retries -= 1;
      if (retries === 0) {
        console.error("atomicSubmitAnswer failed:", error);
        return "failed";
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 10 * Math.pow(2, 5 - retries)),
      );
    }
  }

  return "failed";
}
