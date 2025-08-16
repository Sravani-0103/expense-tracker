import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Smartphone,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    expensesByCategory: [],
    expensesByPaymentMode: [],
    recentTransactions: [],
    monthlyTrends: []
  });
  
  const { currentUser } = useAuth();
  const currentDate = new Date();
  const currentMonth = format(currentDate, 'MMMM yyyy');

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const fetchDashboardData = async () => {
    try {
      const startOfCurrentMonth = startOfMonth(currentDate);
      const endOfCurrentMonth = endOfMonth(currentDate);

      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startOfCurrentMonth),
        where('date', '<=', endOfCurrentMonth)
      );

      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = [];
      let totalExpenses = 0;
      let totalIncome = 0;

      expensesSnapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        expenses.push(data);
        
        if (data.type === 'expense') {
          totalExpenses += data.amount;
        } else {
          totalIncome += data.amount;
        }
      });

      const categoryMap = {};
      const paymentModeMap = {};

      expenses.filter(exp => exp.type === 'expense').forEach((expense) => {
        categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
        paymentModeMap[expense.paymentMode] = (paymentModeMap[expense.paymentMode] || 0) + expense.amount;
      });

      const expensesByCategory = Object.entries(categoryMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

      const expensesByPaymentMode = Object.entries(paymentModeMap)
        .map(([mode, amount]) => ({ mode, amount }))
        .sort((a, b) => b.amount - a.amount);

      const recentQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        limit(10)
      );

      const recentSnapshot = await getDocs(recentQuery);
      const recentTransactions = [];
      recentSnapshot.forEach((doc) => {
        recentTransactions.push({ id: doc.id, ...doc.data() });
      });

      recentTransactions.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });
      const sortedRecentTransactions = recentTransactions.slice(0, 5);

      const monthlyTrends = await getMonthlyTrends();

      setMonthlyData({
        totalExpenses,
        totalIncome,
        expensesByCategory: expensesByCategory.slice(0, 5),
        expensesByPaymentMode,
        recentTransactions: sortedRecentTransactions,
        monthlyTrends
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyTrends = async () => {
    const trends = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      const startOfTargetMonth = startOfMonth(monthDate);
      const endOfTargetMonth = endOfMonth(monthDate);

      const monthQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', startOfTargetMonth),
        where('date', '<=', endOfTargetMonth)
      );

      const monthSnapshot = await getDocs(monthQuery);
      let expenses = 0;
      let income = 0;

      monthSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'expense') {
          expenses += data.amount;
        } else {
          income += data.amount;
        }
      });

      trends.push({
        month: format(monthDate, 'MMM'),
        expenses,
        income
      });
    }

    return trends;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getPaymentModeIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'cash': return <Banknote />;
      case 'upi': return <Smartphone />;
      case 'card':
      case 'debit card':
      case 'credit card': return <CreditCard />;
      default: return <Wallet />;
    }
  };

  const getCategoryColor = (index) => {
    const colors = ['#667eea', '#f093fb', '#f6d55c', '#3dccc7', '#20bf6b', '#eb4d4b'];
    return colors[index % colors.length];
  };

  const getPaymentModeColor = (index) => {
    const colors = ['#6c5ce7', '#fd79a8', '#fdcb6e', '#00b894'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back! 👋</h1>
          <p>Here's your expense overview for {currentMonth}</p>
        </div>
        <Link to="/expenses" className="add-expense-btn">
          <Plus />
          Add Expense
        </Link>
      </div>

      <div className="summary-cards">
        <div className="summary-card expense">
          <div className="card-icon">
            <TrendingUp />
          </div>
          <div className="card-content">
            <h3>Total Expenses</h3>
            <p className="amount">{formatCurrency(monthlyData.totalExpenses)}</p>
            <span className="change">
              <ArrowUpRight />
              This month
            </span>
          </div>
        </div>

        <div className="summary-card income">
          <div className="card-icon">
            <TrendingDown />
          </div>
          <div className="card-content">
            <h3>Total Income</h3>
            <p className="amount">{formatCurrency(monthlyData.totalIncome)}</p>
            <span className="change">
              <ArrowDownRight />
              This month
            </span>
          </div>
        </div>

        <div className="summary-card balance">
          <div className="card-icon">
            <Wallet />
          </div>
          <div className="card-content">
            <h3>Net Balance</h3>
            <p className={`amount ${(monthlyData.totalIncome - monthlyData.totalExpenses) >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(monthlyData.totalIncome - monthlyData.totalExpenses)}
            </p>
            <span className="change">
              {(monthlyData.totalIncome - monthlyData.totalExpenses) >= 0 ? 'Saved' : 'Deficit'}
            </span>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Top Spending Categories</h3>
            <Link to="/reports" className="view-all">View All</Link>
          </div>
          {monthlyData.expensesByCategory.length > 0 ? (
            <div className="pie-chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={monthlyData.expensesByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                  >
                    {monthlyData.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="category-legend">
                {monthlyData.expensesByCategory.map((category, index) => (
                  <div key={category.category} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: getCategoryColor(index) }}
                    ></div>
                    <span className="legend-label">{category.category}</span>
                    <span className="legend-amount">{formatCurrency(category.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>No expenses recorded this month</p>
              <Link to="/expenses" className="btn-link">Add your first expense</Link>
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Monthly Trends</h3>
            <Link to="/reports" className="view-all">View Details</Link>
          </div>
          {monthlyData.monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData.monthlyTrends}>
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="expenses" fill="#eb4d4b" name="Expenses" />
                <Bar dataKey="income" fill="#20bf6b" name="Income" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <p>Not enough data for trends</p>
            </div>
          )}
        </div>
      </div>

      <div className="bottom-section">
        <div className="payment-modes-card">
          <h3>Payment Mode Breakdown</h3>
          {monthlyData.expensesByPaymentMode.length > 0 ? (
            <div className="payment-modes-list">
              {monthlyData.expensesByPaymentMode.map((mode, index) => (
                <div key={mode.mode} className="payment-mode-item">
                  <div className="payment-icon" style={{ backgroundColor: getPaymentModeColor(index) }}>
                    {getPaymentModeIcon(mode.mode)}
                  </div>
                  <div className="payment-details">
                    <p className="payment-name">{mode.mode}</p>
                    <p className="payment-amount">{formatCurrency(mode.amount)}</p>
                  </div>
                  <div className="payment-percentage">
                    {((mode.amount / monthlyData.totalExpenses) * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>No payment data available</p>
            </div>
          )}
        </div>

        <div className="recent-transactions-card">
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <Link to="/expenses" className="view-all">View All</Link>
          </div>
          {monthlyData.recentTransactions.length > 0 ? (
            <div className="transactions-list">
              {monthlyData.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon">
                    {getPaymentModeIcon(transaction.paymentMode)}
                  </div>
                  <div className="transaction-details">
                    <p className="transaction-title">
                      {transaction.notes || transaction.category}
                    </p>
                    <p className="transaction-meta">
                      {transaction.category} • {format(transaction.date.toDate(), 'MMM dd')}
                    </p>
                  </div>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>No recent transactions</p>
              <Link to="/expenses" className="btn-link">Add a transaction</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
