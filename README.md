# Expense Tracker App

Hello! This is my expense tracker application built with React. I made this project to help people track their daily expenses and manage their money better.

## What is this app?

This app helps you to:
- Track your daily expenses 
- Manage different categories like Food, Travel, Shopping etc
- Split expenses with friends and family
- Set savings goals
- View reports and charts of your spending

## Technologies I used

- **React** - For building the user interface
- **Firebase** - For database and authentication  
- **CSS** - For styling and making it look good
- **Vite** - For fast development
- **Chart.js/Recharts** - For showing beautiful charts

## How to run this project on your computer

### Step 1: Download the code
```bash
git clone https://github.com/Sravani-0103/expense-tracker
cd expense-tracker
```

### Step 2: Install all packages
First make sure you have Node.js installed on your computer. Then run:
```bash
npm install
```

### Step 3: Setup Firebase
1. Go to Firebase website and create a new project
2. Enable Authentication and Firestore Database
3. Copy your Firebase config
4. Create a file called `firebase.js` in `src` folder
5. Paste your config there

### Step 4: Start the app
```bash
npm run dev
```

Now open your browser and go to `http://localhost:5173` to see the app!

## Main Features

### Dashboard
- See your total income, expenses and savings
- View charts of your spending patterns
- Quick overview of recent transactions

### Expense Manager  
- Add new expenses easily
- Choose categories like Food, Travel, Bills etc
- Select payment method (Cash, Card, UPI)

### Family Expenses
- Track family spending
- See who spent how much
- Manage household budget

### Festival Mode
- Special tracking for festival expenses
- Set budget for festivals like Diwali, Holi etc

### Expense Splitting
- Split bills with friends
- Create groups for trips or shared expenses
- See who owes whom

### Savings Tracker
- Set savings goals
- Track your progress
- Get motivated to save more!

### Reports
- View detailed reports
- Monthly and yearly analysis  
- Export data if needed

## Problems I faced and solved

1. **Styling Issues** - Initially used regular CSS but converted everything to Tailwind CSS for better responsive design
2. **Firebase Setup** - Took time to understand Firestore database structure
3. **State Management** - Learning how to manage state across multiple components
4. **Responsive Design** - Making sure app works on mobile phones also (still needs some work and minor fixes)

## Future improvements I want to add

- [ ] Dark mode toggle
- [ ] Budget alerts and notifications
- [ ] Currency conversion for international users
- [ ] Offline support
- [ ] Voice input for adding expenses


## Need Help?

If you have any questions or problems running this project, feel free to ask! I'm still learning and would love to help other beginners too.

## Credits

Made by Sravani

Special thanks to:
- YouTube tutorials that helped me learn React
- Firebase documentation

---

**Note**: This is a learning project. The code might not be perfect but it works! Feel free to suggest improvements or report any bugs you find.

Happy coding! 🚀
