# Quiz Runner - Live Quiz Application

A real-time quiz application built with Next.js, featuring live participant tracking, automatic scoring, and a comprehensive moderator dashboard. Perfect for educational settings, team building, or interactive presentations.

## 🚀 Features

### For Participants
- **Easy Login**: Just enter your email - no password required
- **Real-time Updates**: See questions as they're released by the moderator
- **Auto-submit Answers**: Click an option to instantly submit your answer
- **Change Answers**: Easily switch your answer by selecting a different option
- **Timer Mode**: Visual countdown when timer mode is enabled
- **Detailed Results**: See your score, grade, and review all answers (correct, incorrect, and unanswered)

### For Moderators
- **Full Control**: Start, pause, resume, and navigate between questions
- **Two Quiz Modes**:
  - **Manual Control**: Advance questions at your own pace
  - **Auto Timer**: Automatically advance questions after a set duration (15s - 2min)
- **Custom Questions**: Upload your own questions via JSON
- **Live Leaderboard**: See all participants ranked by score in real-time
- **Participant Tracking**: View all registered participants
- **Results Management**: Control when results are shown to participants

## 📋 Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- Upstash Redis account (free tier available)
- Basic knowledge of JSON for custom questions

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd v0-quiz-app-without-database
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Upstash Redis Configuration
# Get these from https://console.upstash.com/
KV_REST_API_URL=your_upstash_redis_url_here
KV_REST_API_TOKEN=your_upstash_redis_token_here

# Admin Key (for admin dashboard access)
# Change this to a secure key in production
ADMIN_KEY=admin123

# Optional: App URL (for sharing)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Getting Upstash Redis Credentials:

1. Go to [https://console.upstash.com/](https://console.upstash.com/)
2. Sign up or log in (free tier available)
3. Create a new Redis database
4. Copy the `REST API URL` and `REST API TOKEN`
5. Paste them into your `.env.local` file

### 4. Run the Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Access Moderator Dashboard

Navigate to [http://localhost:3000/moderator](http://localhost:3000/moderator) and:
- **First time?** Click "Register" to create an account with email, password, and name
- **Returning?** Click "Login" and enter your email and password
- After login, you'll get a unique quiz URL to share with participants

### 6. Access Admin Dashboard (Optional)

Navigate to [http://localhost:3000/admin](http://localhost:3000/admin) and:
- Enter your admin key (default: `admin123`, set via `ADMIN_KEY` env variable)
- View system-wide statistics and all teams
- Clear data for individual teams or the entire database

## 📝 Uploading Custom Questions

### Question Format

Questions must be in JSON format. Here's the template:

```json
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctOption": 2
  },
  {
    "question": "Which planet is the Red Planet?",
    "options": ["Venus", "Mars", "Jupiter", "Saturn"],
    "correctOption": 1
  }
]
```

### Question Structure

- `question` (string): The question text
- `options` (array): Array of answer choices (2-6 options recommended)
- `correctOption` (number): **0-based index** of the correct answer

**Important**: `correctOption` is 0-based, so:
- First option (A) = 0
- Second option (B) = 1
- Third option (C) = 2
- Fourth option (D) = 3

### Upload Steps

1. Go to the Moderator Dashboard
2. Click "Upload Questions"
3. Paste your JSON questions
4. Click "Upload Questions"
5. Questions are saved and will be used for the next quiz

## 🎮 How to Run a Quiz

### Step 1: Register/Login as Moderator
- Go to `/moderator`
- Register with email, password, and name (or login if you have an account)
- You'll receive a unique team ID and quiz URL

### Step 2: Share Your Quiz Link
- Copy the quiz link shown in your dashboard (format: `/quiz/[teamId]`)
- Share this link with participants
- Each moderator has their own isolated quiz session

### Step 3: Prepare Questions
- Use default questions, or
- Upload custom questions via the moderator dashboard

### Step 4: Set Quiz Mode
- Choose **Manual Control** or **Auto Timer**
- If using Auto Timer, select the time per question

### Step 5: Start the Quiz
- Click "Start Quiz"
- Participants visiting your team URL can now see and answer questions

### Step 4: Manage the Quiz
- **Manual Mode**: Click "Next" to advance questions
- **Timer Mode**: Questions advance automatically
- Use "Pause" to temporarily stop the quiz
- Use "Previous" to go back to earlier questions
- Use "Jump to Question" buttons for quick navigation

### Step 5: Show Results
- Click "Show Results" when ready
- Participants will see their scores and answer review
- Leaderboard updates automatically

## 🔧 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 📱 Features in Detail

### Real-time Synchronization
- Participants see questions as they're released
- Answers are saved instantly
- Leaderboard updates every 5 seconds
- Quiz state syncs every 2-3 seconds

### Answer Review
After results are shown, participants can see:
- ✅ Correct answers (green)
- ❌ Incorrect answers (red) with correct answer shown
- ⚪ Unanswered questions (gray) with correct answer shown

### Leaderboard
- Shows all participants, even those with 0 answers
- Sorted by: correct count → percentage → total answered
- Updates in real-time
- Scrollable for large participant lists

## 🚨 Troubleshooting

### "Failed to fetch" errors
- Check your Upstash Redis credentials
- Ensure `.env.local` file exists and has correct values
- Restart the development server after changing env variables

### Participants not appearing
- Check that users have successfully logged in
- Verify Redis connection is working
- Check browser console for errors

### Questions not uploading
- Verify JSON format is correct
- Check that `correctOption` is a valid index (0 to options.length - 1)
- Ensure all required fields are present

## 🔐 Admin Dashboard

The admin dashboard provides system-wide oversight and management:

### Features:
- **System Overview**: View all moderators, teams, participants, and answers
- **Real-time Statistics**: See active quizzes, total participants, and answer counts
- **Team Management**: View detailed information for each team including:
  - Moderator details
  - Participant count
  - Answer statistics
  - Quiz state (active/paused/results shown)
  - Custom questions status
- **Data Management**:
  - Clear data for individual teams (removes all quiz data, participants, and answers for that team)
  - Clear entire database (removes ALL data including all moderators - use with extreme caution!)

### Access:
- Navigate to `/admin`
- Enter your admin key (set via `ADMIN_KEY` environment variable)
- Default key: `admin123` (change in production!)

### Security:
- Admin key is stored in environment variables
- Sessions expire after 24 hours
- All admin actions require authentication
- Clear database actions require double confirmation

## 🔒 Security & Performance Notes

### Race Condition Protection
The app includes robust race condition handling for high-concurrency scenarios:

- **Moderator Registration**: Uses double-check pattern with exponential backoff retries (up to 5 attempts)
- **Participant Registration**: Implements atomic read-check-write pattern with retry logic
- **Concurrent Access**: Handles 100+ simultaneous registrations safely
- **Exponential Backoff**: Retries use increasing delays (10ms → 160ms) to reduce contention

### Security Considerations
- **Password Hashing**: Currently uses base64 (simple). **Use bcrypt or similar in production**
- **Sessions**: Stored in localStorage (client-side). Consider httpOnly cookies for production
- **Email Validation**: Basic format check. Enhance for production use
- **Team Isolation**: Each team's data is completely isolated - no cross-team access
- **Session Expiry**: Moderator sessions expire after 7 days

### Deprecated Features
- **MODERATOR_KEY**: No longer used. Moderators now use email/password authentication

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all environment variables in your hosting platform:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `NEXT_PUBLIC_APP_URL` (your production URL)

**Note:** The old `MODERATOR_KEY` environment variable is no longer used. Moderators now register and login with email/password, and each gets a unique team ID.

## 📊 Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Upstash Redis
- **State Management**: SWR for data fetching
- **UI Components**: Radix UI
- **Notifications**: Sonner

## 🤝 Contributing

This is an MVP project. Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🎯 Future Enhancements

Potential features for future versions:
- User authentication system
- Multiple quiz sessions
- Question categories
- Export results to CSV/PDF
- Quiz templates
- Image support in questions
- Mobile app
- Real-time chat
- Question statistics

---

**Built with ❤️ using Next.js and Upstash Redis**
