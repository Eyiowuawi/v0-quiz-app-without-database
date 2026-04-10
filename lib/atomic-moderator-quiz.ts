import { redis, KEYS, type QuizState } from "@/lib/redis";

const APPLY_MODERATOR_STATE_LUA = `
local key = KEYS[1]
local action = ARGV[1]
local payload = cjson.decode(ARGV[2])
local qc = tonumber(payload.qc) or 0
local now = tonumber(payload.now) or 0

local function load_state()
  local raw = redis.call('GET', key)
  if type(raw) ~= 'string' or #raw == 0 then
    return {
      currentQuestionIndex = -1,
      isActive = false,
      showResults = false,
      timerMode = false,
      timerDuration = 30
    }
  end
  local ok, s = pcall(cjson.decode, raw)
  if ok and type(s) == 'table' then return s end
  return {
    currentQuestionIndex = -1,
    isActive = false,
    showResults = false,
    timerMode = false,
    timerDuration = 30
  }
end

local state = load_state()

if action == 'start' then
  local tm = payload.tm
  local td = payload.td
  if tm == nil then tm = state.timerMode end
  if tm == nil then tm = false end
  if td == nil then td = state.timerDuration end
  if td == nil then td = 30 end
  state = {
    currentQuestionIndex = 0,
    isActive = true,
    showResults = false,
    timerMode = tm,
    timerDuration = td,
    questionStartTime = now
  }
elseif action == 'next' then
  if state.currentQuestionIndex < qc - 1 then
    state.currentQuestionIndex = state.currentQuestionIndex + 1
    state.isActive = true
    state.questionStartTime = now
  else
    state.isActive = false
    state.showResults = true
  end
elseif action == 'previous' then
  if state.currentQuestionIndex > 0 then
    state.currentQuestionIndex = state.currentQuestionIndex - 1
    state.isActive = true
    state.questionStartTime = now
  end
elseif action == 'goto' then
  local qi = tonumber(payload.qi)
  if qi and qi >= 0 and qi < qc then
    state.currentQuestionIndex = qi
    state.isActive = true
    state.showResults = false
    state.questionStartTime = now
  end
elseif action == 'pause' then
  state.isActive = false
elseif action == 'resume' then
  state.isActive = true
  state.showResults = false
  state.questionStartTime = now
elseif action == 'showResults' then
  state.isActive = false
  state.showResults = true
elseif action == 'setTimerMode' then
  local tm = payload.tm
  local td = payload.td
  if tm == nil then tm = false end
  if td == nil then td = 30 end
  state.timerMode = tm
  state.timerDuration = td
else
  return cjson.encode({ ok = false, code = 'unknown_action' })
end

redis.call('SET', key, cjson.encode(state))
return cjson.encode({ ok = true, state = state })
`;

const RESET_QUIZ_LUA = `
local stateKey = KEYS[1]
local answersKey = KEYS[2]
local usersKey = KEYS[3]
local teamId = ARGV[1]
local qc = tonumber(ARGV[2]) or 0

local defaultState = {
  currentQuestionIndex = -1,
  isActive = false,
  showResults = false,
  timerMode = false,
  timerDuration = 30
}

redis.call('SET', answersKey, '[]')

local usersRaw = redis.call('GET', usersKey)
if type(usersRaw) == 'string' and #usersRaw > 0 then
  local ok, users = pcall(cjson.decode, usersRaw)
  if ok and type(users) == 'table' then
    for _, u in ipairs(users) do
      local email = u.email
      if email then
        for i = 0, qc - 1 do
          redis.call('DEL', 'quiz:answer:' .. teamId .. ':' .. email .. ':' .. i)
        end
      end
    end
  end
end

redis.call('SET', stateKey, cjson.encode(defaultState))
return cjson.encode({ ok = true, state = defaultState })
`;

const CLEAR_TEAM_DATA_LUA = `
local stateKey = KEYS[1]
local answersKey = KEYS[2]
local usersKey = KEYS[3]
local customKey = KEYS[4]
local teamId = ARGV[1]
local qc = tonumber(ARGV[2]) or 0

redis.call('DEL', stateKey)
redis.call('DEL', answersKey)

local usersRaw = redis.call('GET', usersKey)
if type(usersRaw) == 'string' and #usersRaw > 0 then
  local ok, users = pcall(cjson.decode, usersRaw)
  if ok and type(users) == 'table' then
    for _, u in ipairs(users) do
      local email = u.email
      if email then
        redis.call('DEL', 'quiz:session:' .. teamId .. ':' .. email)
        for i = 0, qc - 1 do
          redis.call('DEL', 'quiz:answer:' .. teamId .. ':' .. email .. ':' .. i)
        end
      end
    end
  end
end

redis.call('DEL', usersKey)
redis.call('DEL', customKey)
return cjson.encode({ ok = true })
`;

type ApplyPayload = {
  qc: number;
  now: number;
  qi?: number;
  tm?: boolean;
  td?: number;
};

function parseEvalJson(raw: unknown): unknown {
  const text = typeof raw === "string" ? raw : String(raw);
  return JSON.parse(text);
}

export async function atomicApplyModeratorQuizState(
  teamId: string,
  action: string,
  payload: ApplyPayload,
): Promise<
  { ok: true; state: QuizState } | { ok: false; code: string }
> {
  const key = KEYS.QUIZ_STATE(teamId);
  const body = JSON.stringify({
    qc: payload.qc,
    now: payload.now,
    ...(payload.qi !== undefined ? { qi: payload.qi } : {}),
    ...(payload.tm !== undefined ? { tm: payload.tm } : {}),
    ...(payload.td !== undefined ? { td: payload.td } : {}),
  });

  let retries = 5;
  while (retries > 0) {
    try {
      const raw = await redis.eval(APPLY_MODERATOR_STATE_LUA, [key], [
        action,
        body,
      ]);
      const parsed = parseEvalJson(raw) as {
        ok: boolean;
        state?: QuizState;
        code?: string;
      };
      if (!parsed.ok) {
        return { ok: false, code: parsed.code || "unknown" };
      }
      return { ok: true, state: parsed.state as QuizState };
    } catch (e) {
      retries -= 1;
      if (retries === 0) {
        console.error("atomicApplyModeratorQuizState failed:", e);
        return { ok: false, code: "redis_error" };
      }
      await new Promise((r) =>
        setTimeout(r, 10 * Math.pow(2, 5 - retries)),
      );
    }
  }
  return { ok: false, code: "redis_error" };
}

export async function atomicResetModeratorQuiz(
  teamId: string,
  questionCount: number,
): Promise<{ ok: true; state: QuizState } | { ok: false }> {
  let retries = 5;
  while (retries > 0) {
    try {
      const raw = await redis.eval(
        RESET_QUIZ_LUA,
        [KEYS.QUIZ_STATE(teamId), KEYS.ANSWERS(teamId), KEYS.USERS(teamId)],
        [teamId, String(questionCount)],
      );
      const parsed = parseEvalJson(raw) as { ok: boolean; state?: QuizState };
      if (!parsed.ok || !parsed.state) {
        return { ok: false };
      }
      return { ok: true, state: parsed.state };
    } catch (e) {
      retries -= 1;
      if (retries === 0) {
        console.error("atomicResetModeratorQuiz failed:", e);
        return { ok: false };
      }
      await new Promise((r) =>
        setTimeout(r, 10 * Math.pow(2, 5 - retries)),
      );
    }
  }
  return { ok: false };
}

export async function atomicClearTeamQuizData(
  teamId: string,
  questionCount: number,
): Promise<boolean> {
  let retries = 5;
  while (retries > 0) {
    try {
      const raw = await redis.eval(
        CLEAR_TEAM_DATA_LUA,
        [
          KEYS.QUIZ_STATE(teamId),
          KEYS.ANSWERS(teamId),
          KEYS.USERS(teamId),
          KEYS.CUSTOM_QUESTIONS(teamId),
        ],
        [teamId, String(questionCount)],
      );
      const parsed = parseEvalJson(raw) as { ok?: boolean };
      return parsed.ok === true;
    } catch (e) {
      retries -= 1;
      if (retries === 0) {
        console.error("atomicClearTeamQuizData failed:", e);
        return false;
      }
      await new Promise((r) =>
        setTimeout(r, 10 * Math.pow(2, 5 - retries)),
      );
    }
  }
  return false;
}
