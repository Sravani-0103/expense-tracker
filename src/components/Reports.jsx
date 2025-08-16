import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle,
  Target,
  CreditCard,
  Banknote,
  Download,
  Filter,
  Eye
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths, parseISO, isValid } from 'date-fns';
import './Reports.css';

const Reports = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');
  const [selectedPeriod, setSelectedPeriod] = useState(new Date());
  const [reportType, setReportType] = useState('overview');

  const { currentUser } = useAuth();

  const expenseCategories = [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Bills & Utilities', 'Healthcare', 'Education', 'Travel',
    'Groceries', 'Fuel', 'Personal Care', 'Other'
  ];

  const paymentModes = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Other'];

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
    }
  }, [currentUser, timeframe, selectedPeriod]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      switch (timeframe) {
        case 'week':
          startDate = startOfWeek(selectedPeriod);
          endDate = endOfWeek(selectedPeriod);
          break;
        case 'month':
          startDate = startOfMonth(selectedPeriod);
          endDate = endOfMonth(selectedPeriod);
          break;
        case 'quarter':
          const quarterStart = new Date(selectedPeriod.getFullYear(), Math.floor(selectedPeriod.getMonth() / 3) * 3, 1);
          startDate = quarterStart;
          endDate = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
          break;
        case 'year':
          startDate = new Date(selectedPeriod.getFullYear(), 0, 1);
          endDate = new Date(selectedPeriod.getFullYear(), 11, 31);
          break;
        default:
          startDate = startOfMonth(selectedPeriod);
          endDate = endOfMonth(selectedPeriod);
      }

      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const expensesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expensesList.push({ 
          id: doc.id, 
          ...data,
          date: data.date.toDate()
        });
      });

      setExpenses(expensesList);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getTotalIncome = () => {
    return expenses.filter(expense => expense.type === 'income')
      .reduce((total, income) => total + income.amount, 0);
  };

  const getExpensesByCategory = () => {
    const categoryMap = {};
    expenses.filter(expense => expense.type === 'expense').forEach(expense => {
      categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
    });
    
    return Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getExpensesByPaymentMode = () => {
    const paymentMap = {};
    expenses.filter(expense => expense.type === 'expense').forEach(expense => {
      paymentMap[expense.paymentMode] = (paymentMap[expense.paymentMode] || 0) + expense.amount;
    });
    
    return Object.entries(paymentMap)
      .map(([mode, amount]) => ({ mode, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getCashVsDigital = () => {
    const cash = expenses
      .filter(expense => expense.type === 'expense' && expense.paymentMode === 'Cash')
      .reduce((total, expense) => total + expense.amount, 0);
    
    const digital = expenses
      .filter(expense => expense.type === 'expense' && expense.paymentMode !== 'Cash')
      .reduce((total, expense) => total + expense.amount, 0);

    return [
      { name: 'Cash', value: cash },
      { name: 'Digital', value: digital }
    ];
  };

  const getMonthlyTrend = () => {
    const monthlyData = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'MMM yyyy');
      monthlyData[monthKey] = { month: monthKey, expenses: 0, income: 0 };
    }

    const fetchMonthlyData = async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', Timestamp.fromDate(sixMonthsAgo)),
        orderBy('date', 'desc')
      );

      try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const date = data.date.toDate();
          const monthKey = format(date, 'MMM yyyy');
          
          if (monthlyData[monthKey]) {
            if (data.type === 'expense') {
              monthlyData[monthKey].expenses += data.amount;
            } else {
              monthlyData[monthKey].income += data.amount;
            }
          }
        });
      } catch (error) {
        console.error('Error fetching monthly trend:', error);
      }
    };

    fetchMonthlyData();
    
    return Object.values(monthlyData);
  };

  const getTopSpendingCategories = (limit = 5) => {
    const categoryData = getExpensesByCategory();
    return categoryData.slice(0, limit);
  };

  const getRecentLargeTransactions = (limit = 5) => {
    return expenses
      .filter(expense => expense.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  };

  const getSpendingAlerts = () => {
    const alerts = [];
    const totalExpenses = getTotalExpenses();
    const totalIncome = getTotalIncome();
    
    if (totalExpenses > totalIncome * 0.8) {
      alerts.push({
        type: 'warning',
        message: 'You\'re spending more than 80% of your income this period',
        icon: AlertTriangle
      });
    }

    const topCategory = getExpensesByCategory()[0];
    if (topCategory && topCategory.amount > totalExpenses * 0.4) {
      alerts.push({
        type: 'info',
        message: `${topCategory.category} accounts for more than 40% of your spending`,
        icon: PieIcon
      });
    }

    const cashVsDigital = getCashVsDigital();
    const cashPercentage = cashVsDigital[0].value / (cashVsDigital[0].value + cashVsDigital[1].value) * 100;
    if (cashPercentage > 60) {
      alerts.push({
        type: 'info',
        message: `You're using cash for ${cashPercentage.toFixed(1)}% of transactions`,
        icon: Banknote
      });
    }

    return alerts;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Mode'];
    const csvContent = [
      headers.join(','),
      ...expenses.map(expense => [
        format(expense.date, 'yyyy-MM-dd'),
        expense.type,
        expense.category,
        `"${expense.description}"`,
        expense.amount,
        expense.paymentMode
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-report-${format(selectedPeriod, 'yyyy-MM')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getColorForIndex = (index) => {
    const colors = ['#20bf6b', '#3dccc7', '#667eea', '#f093fb', '#f6d55c', '#eb4d4b', '#6c5ce7', '#fd79a8'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="loading-spinner"></div>
        <p>Generating reports...</p>
      </div>
    );
  }

  const totalExpenses = getTotalExpenses();
  const totalIncome = getTotalIncome();
  const netSavings = totalIncome - totalExpenses;
  const expensesByCategory = getExpensesByCategory();
  const expensesByPaymentMode = getExpensesByPaymentMode();
  const cashVsDigital = getCashVsDigital();
  const topCategories = getTopSpendingCategories();
  const recentLargeTransactions = getRecentLargeTransactions();
  const alerts = getSpendingAlerts();
  const monthlyTrend = getMonthlyTrend();

  return (
    <div className="reports">
      <div className="reports-header">
        <div className="header-content">
          <h1>📊 Insights & Reports</h1>
          <p>Comprehensive analysis of your financial data</p>
        </div>

        <div className="report-controls">
          <div className="timeframe-selector">
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="timeframe-select"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="report-type-selector">
            <button 
              className={`report-type-btn ${reportType === 'overview' ? 'active' : ''}`}
              onClick={() => setReportType('overview')}
            >
              <Eye />
              Overview
            </button>
            <button 
              className={`report-type-btn ${reportType === 'detailed' ? 'active' : ''}`}
              onClick={() => setReportType('detailed')}
            >
              <BarChart3 />
              Detailed
            </button>
          </div>

          <button className="export-btn" onClick={exportToCSV}>
            <Download />
            Export CSV
          </button>
        </div>
      </div>

      <div className="summary-section">
        <div className="summary-card income">
          <div className="card-icon">
            <TrendingUp />
          </div>
          <div className="card-content">
            <h3>Total Income</h3>
            <p className="amount">{formatCurrency(totalIncome)}</p>
            <span className="period">{timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : timeframe === 'quarter' ? 'This Quarter' : 'This Year'}</span>
          </div>
        </div>

        <div className="summary-card expenses">
          <div className="card-icon">
            <TrendingDown />
          </div>
          <div className="card-content">
            <h3>Total Expenses</h3>
            <p className="amount">{formatCurrency(totalExpenses)}</p>
            <span className="period">{expenses.length} transactions</span>
          </div>
        </div>

        <div className={`summary-card savings ${netSavings >= 0 ? 'positive' : 'negative'}`}>
          <div className="card-icon">
            <Target />
          </div>
          <div className="card-content">
            <h3>Net Savings</h3>
            <p className="amount">{formatCurrency(netSavings)}</p>
            <span className="period">
              {netSavings >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>

        <div className="summary-card avg-daily">
          <div className="card-icon">
            <Calendar />
          </div>
          <div className="card-content">
            <h3>Avg Daily Spend</h3>
            <p className="amount">
              {formatCurrency(totalExpenses / (timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : timeframe === 'quarter' ? 90 : 365))}
            </p>
            <span className="period">Per day</span>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>🚨 Financial Alerts</h2>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert-card ${alert.type}`}>
                <div className="alert-icon">
                  <alert.icon />
                </div>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'overview' && (
        <>
          <div className="charts-section">
            <div className="chart-card category-chart">
              <h3>💰 Spending by Category</h3>
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="amount"
                      label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getColorForIndex(index)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">
                  <PieIcon className="no-data-icon" />
                  <p>No expense data for this period</p>
                </div>
              )}
            </div>

            <div className="chart-card payment-chart">
              <h3>💳 Payment Method Distribution</h3>
              {expensesByPaymentMode.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expensesByPaymentMode}>
                    <XAxis dataKey="mode" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#667eea" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">
                  <CreditCard className="no-data-icon" />
                  <p>No payment data for this period</p>
                </div>
              )}
            </div>

            <div className="chart-card cash-digital-chart">
              <h3>💸 Cash vs Digital Payments</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cashVsDigital}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    <Cell fill="#f39c12" />
                    <Cell fill="#3742fa" />
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card trend-chart">
              <h3>📈 6-Month Spending Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrend}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#eb4d4b" 
                    fill="rgba(235, 77, 75, 0.3)" 
                    name="Expenses"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#20bf6b" 
                    fill="rgba(32, 191, 107, 0.3)" 
                    name="Income"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="insights-section">
            <div className="top-categories">
              <h3>🏆 Top Spending Categories</h3>
              {topCategories.length > 0 ? (
                <div className="categories-list">
                  {topCategories.map((category, index) => (
                    <div key={category.category} className="category-item">
                      <div className="category-info">
                        <div className="category-rank">#{index + 1}</div>
                        <div className="category-details">
                          <h4>{category.category}</h4>
                          <div className="category-progress">
                            <div 
                              className="progress-bar"
                              style={{ 
                                width: `${(category.amount / topCategories[0].amount) * 100}%`,
                                backgroundColor: getColorForIndex(index)
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="category-amount">
                        <span className="amount">{formatCurrency(category.amount)}</span>
                        <span className="percentage">
                          {((category.amount / totalExpenses) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <Target className="no-data-icon" />
                  <p>No category data available</p>
                </div>
              )}
            </div>

            <div className="recent-transactions">
              <h3>💸 Largest Transactions</h3>
              {recentLargeTransactions.length > 0 ? (
                <div className="transactions-list">
                  {recentLargeTransactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-item">
                      <div className="transaction-info">
                        <h4>{transaction.description}</h4>
                        <div className="transaction-meta">
                          <span className="category">{transaction.category}</span>
                          <span className="date">{format(transaction.date, 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                      <div className="transaction-amount">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <TrendingDown className="no-data-icon" />
                  <p>No transaction data available</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {reportType === 'detailed' && (
        <div className="detailed-section">
          <div className="detailed-tables">
            <div className="table-card">
              <h3>📊 Category-wise Breakdown</h3>
              <div className="table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Transactions</th>
                      <th>Average</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesByCategory.map((category) => {
                      const categoryTransactions = expenses.filter(e => 
                        e.type === 'expense' && e.category === category.category
                      );
                      return (
                        <tr key={category.category}>
                          <td>{category.category}</td>
                          <td>{formatCurrency(category.amount)}</td>
                          <td>{categoryTransactions.length}</td>
                          <td>{formatCurrency(category.amount / categoryTransactions.length || 0)}</td>
                          <td>{((category.amount / totalExpenses) * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="table-card">
              <h3>💳 Payment Method Analysis</h3>
              <div className="table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Payment Mode</th>
                      <th>Amount</th>
                      <th>Transactions</th>
                      <th>Average</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesByPaymentMode.map((payment) => {
                      const paymentTransactions = expenses.filter(e => 
                        e.type === 'expense' && e.paymentMode === payment.mode
                      );
                      return (
                        <tr key={payment.mode}>
                          <td>{payment.mode}</td>
                          <td>{formatCurrency(payment.amount)}</td>
                          <td>{paymentTransactions.length}</td>
                          <td>{formatCurrency(payment.amount / paymentTransactions.length || 0)}</td>
                          <td>{((payment.amount / totalExpenses) * 100).toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="all-transactions">
            <h3>📋 All Transactions ({expenses.length})</h3>
            <div className="transactions-table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Payment Mode</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className={expense.type}>
                      <td>{format(expense.date, 'MMM dd, yyyy')}</td>
                      <td>
                        <span className={`type-badge ${expense.type}`}>
                          {expense.type === 'expense' ? 'Expense' : 'Income'}
                        </span>
                      </td>
                      <td>{expense.description}</td>
                      <td>{expense.category}</td>
                      <td>{expense.paymentMode}</td>
                      <td className={`amount ${expense.type}`}>
                        {expense.type === 'expense' ? '-' : '+'}
                        {formatCurrency(expense.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
