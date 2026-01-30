export interface Question {
  id?: number
  question: string
  options: string[]
  correctOption: number // 0-indexed
}

export const quizQuestions: Question[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctOption: 2,
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctOption: 1,
  },
  {
    id: 3,
    question: "What is the largest mammal in the world?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
    correctOption: 1,
  },
  {
    id: 4,
    question: "In what year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correctOption: 2,
  },
  {
    id: 5,
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctOption: 2,
  },
  {
    id: 6,
    question: "Which programming language was created by Brendan Eich?",
    options: ["Python", "JavaScript", "Java", "C++"],
    correctOption: 1,
  },
  {
    id: 7,
    question: "How many continents are there on Earth?",
    options: ["5", "6", "7", "8"],
    correctOption: 2,
  },
  {
    id: 8,
    question: "What is the speed of light in a vacuum (approximately)?",
    options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    correctOption: 0,
  },
  {
    id: 9,
    question: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
    correctOption: 2,
  },
  {
    id: 10,
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correctOption: 3,
  },
]
