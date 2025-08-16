import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy, startAt, endAt, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const [monthlyData, setMonthlyData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    savings: 0,
    savingsGoal: 50000,
    expensesByCategory: [],
    monthlyTrends: [],
    expensesByPaymentMode: [],
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        orderBy('date', 'desc')
      );

      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));

      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalIncome = 0;
      const savings = totalIncome - totalExpenses;

      const categoryTotals = {};
      expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      });

      const expensesByCategory = Object.entries(categoryTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const paymentTotals = {};
      expenses.forEach(expense => {
        paymentTotals[expense.paymentMethod] = (paymentTotals[expense.paymentMethod] || 0) + expense.amount;
      });

      const expensesByPaymentMode = Object.entries(paymentTotals)
        .map(([mode, amount]) => ({ mode, amount }))
        .sort((a, b) => b.amount - a.amount);

      setMonthlyData({
        totalIncome,
        totalExpenses,
        savings,
        savingsGoal: 50000,
        expensesByCategory,
        monthlyTrends: [],
        expensesByPaymentMode,
        recentTransactions: expenses.slice(0, 5)
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (index) => {
    const colors = ['#ff6b9d', '#45aaf2', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    return colors[index % colors.length];
  };

  const getPaymentModeColor = (index) => {
    const colors = ['#45aaf2', '#96ceb4', '#feca57', '#ff6b9d'];
    return colors[index % colors.length];
  };

  const getTransactionIcon = (category) => {
    const icons = {
      Food: '🍽️',
      Transport: '🚗',
      Shopping: '🛍️',
      Entertainment: '🎬',
      Bills: '💰',
      Healthcare: '🏥',
      Education: '📚',
      Other: '📝'
    };
    return icons[category] || '📝';
  };

  if (loading) {
    return (
      <div className="w-full max-w-none p-4 md:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
        <div className="mb-4 md:mb-0">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">📊 Dashboard</h1>
          <p className="text-gray-600 text-sm md:text-base">Your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 md:gap-3 mt-4 md:mt-0">
          <Link to="/expense-manager" className="btn-primary text-sm md:text-base">
            + Add Expense
          </Link>
          <Link to="/reports" className="btn-secondary text-sm md:text-base">
            View Reports
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="card border-l-4 border-l-blue-500">
          <div className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Income</h3>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">₹{monthlyData.totalIncome.toLocaleString()}</p>
            <p className="text-sm mt-2 text-green-600">+0% from last month</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-red-500">
          <div className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Expenses</h3>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">₹{monthlyData.totalExpenses.toLocaleString()}</p>
            <p className="text-sm mt-2 text-red-600">+0% from last month</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-green-500">
          <div className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Net Savings</h3>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">₹{monthlyData.savings.toLocaleString()}</p>
            <p className="text-sm mt-2 text-green-600">Keep it up!</p>
          </div>
        </div>

        <div className="card border-l-4 border-l-purple-500">
          <div className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Savings Goal</h3>
            <p className="text-2xl md:text-3xl font-bold text-gray-800">
              {Math.round((Math.abs(monthlyData.savings) / monthlyData.savingsGoal) * 100)}%
            </p>
            <p className="text-sm mt-2 text-purple-600">of ₹{monthlyData.savingsGoal.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
        <div className="card">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Top Spending Categories</h3>
            <Link to="/reports" className="text-sm text-primary-500 hover:text-primary-600">View All</Link>
          </div>
          {monthlyData.expensesByCategory.length > 0 ? (
            <div className="space-y-3">
              {monthlyData.expensesByCategory.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3" 
                      style={{ backgroundColor: getCategoryColor(index) }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">₹{category.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-600">No expenses recorded yet</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Monthly Trends</h3>
            <Link to="/reports" className="text-sm text-primary-500 hover:text-primary-600">View All</Link>
          </div>
          {monthlyData.monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Bar dataKey="expenses" fill="#ff6b9d" name="Expenses" />
                <Bar dataKey="income" fill="#20bf6b" name="Income" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-600">Not enough data for trends</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Mode Breakdown</h3>
          {monthlyData.expensesByPaymentMode.length > 0 ? (
            <div className="space-y-3">
              {monthlyData.expensesByPaymentMode.map((mode, index) => (
                <div key={mode.mode} className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3" 
                    style={{ backgroundColor: getPaymentModeColor(index) }}
                  >
                    {mode.mode.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{mode.mode}</p>
                    <p className="text-xs text-gray-500">₹{mode.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">💳</div>
              <p className="text-gray-600">No payment data available</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          {monthlyData.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {monthlyData.recentTransactions.map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 bg-primary-500">
                      {getTransactionIcon(transaction.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{transaction.description}</p>
                      <p className="text-xs text-gray-500">{transaction.date?.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    -₹{transaction.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">💸</div>
              <p className="text-gray-600">No recent transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
