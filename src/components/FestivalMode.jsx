import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar,
  Plus,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Gift,
  Star,
  Sparkles
} from 'lucide-react';
import { format, subYears } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './FestivalMode.css';

const FestivalMode = () => {
  const [festivals, setFestivals] = useState([]);
  const [activeFestival, setActiveFestival] = useState(null);
  const [festivalExpenses, setFestivalExpenses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [yearlyComparison, setYearlyComparison] = useState([]);

  const { currentUser } = useAuth();

  const [festivalFormData, setFestivalFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    budget: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  const [expenseFormData, setExpenseFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm')
  });

  const popularFestivals = [
    'Diwali', 'Holi', 'Eid', 'Christmas', 'Dussehra', 'Navratri', 
    'Ganesh Chaturthi', 'Karva Chauth', 'Onam', 'Pongal', 'Baisakhi',
    'Raksha Bandhan', 'Janmashtami', 'Durga Puja', 'Wedding', 'Birthday'
  ];

  const festivalCategories = [
    'Decorations', 'Food & Sweets', 'Gifts', 'Clothes & Jewelry', 
    'Travel', 'Entertainment', 'Religious Items', 'Fireworks', 'Other'
  ];

  useEffect(() => {
    if (currentUser) {
      fetchFestivals();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeFestival) {
      fetchFestivalExpenses(activeFestival.id);
      fetchYearlyComparison(activeFestival.name);
    }
  }, [activeFestival]);

  const fetchFestivals = async () => {
    try {
      const q = query(
        collection(db, 'festivals'),
        where('userId', '==', currentUser.uid),
        orderBy('year', 'desc'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const festivalsList = [];
      querySnapshot.forEach((doc) => {
        festivalsList.push({ id: doc.id, ...doc.data() });
      });

      setFestivals(festivalsList);
      if (festivalsList.length > 0 && !activeFestival) {
        setActiveFestival(festivalsList[0]);
      }
    } catch (error) {
      console.error('Error fetching festivals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFestivalExpenses = async (festivalId) => {
    try {
      const q = query(
        collection(db, 'festivalExpenses'),
        where('festivalId', '==', festivalId),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const expensesList = [];
      querySnapshot.forEach((doc) => {
        expensesList.push({ id: doc.id, ...doc.data() });
      });

      setFestivalExpenses(expensesList);
    } catch (error) {
      console.error('Error fetching festival expenses:', error);
    }
  };

  const fetchYearlyComparison = async (festivalName) => {
    try {
      const currentYear = new Date().getFullYear();
      const comparisonData = [];

      for (let i = 0; i < 3; i++) {
        const year = currentYear - i;
        const festivalQuery = query(
          collection(db, 'festivals'),
          where('userId', '==', currentUser.uid),
          where('name', '==', festivalName),
          where('year', '==', year)
        );

        const festivalSnapshot = await getDocs(festivalQuery);
        let totalSpent = 0;
        let budget = 0;

        festivalSnapshot.forEach((doc) => {
          const data = doc.data();
          budget = data.budget;
          totalSpent = data.totalSpent || 0;
        });

        if (totalSpent > 0) {
          comparisonData.push({
            year: year.toString(),
            budget,
            spent: totalSpent
          });
        }
      }

      setYearlyComparison(comparisonData.reverse());
    } catch (error) {
      console.error('Error fetching yearly comparison:', error);
    }
  };

  const handleFestivalSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const festivalData = {
        ...festivalFormData,
        budget: parseFloat(festivalFormData.budget),
        year: parseInt(festivalFormData.year),
        startDate: Timestamp.fromDate(new Date(festivalFormData.startDate)),
        endDate: Timestamp.fromDate(new Date(festivalFormData.endDate)),
        userId: currentUser.uid,
        totalSpent: 0,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'festivals'), festivalData);
      
      const newFestival = { id: docRef.id, ...festivalData };
      setFestivals([newFestival, ...festivals]);
      setActiveFestival(newFestival);
      
      resetFestivalForm();
    } catch (error) {
      console.error('Error creating festival:', error);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const expenseData = {
        ...expenseFormData,
        amount: parseFloat(expenseFormData.amount),
        date: Timestamp.fromDate(new Date(`${expenseFormData.date}T${expenseFormData.time}`)),
        festivalId: activeFestival.id,
        festivalName: activeFestival.name,
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'festivalExpenses'), expenseData);
      
      const newTotalSpent = (activeFestival.totalSpent || 0) + expenseData.amount;
      await updateDoc(doc(db, 'festivals', activeFestival.id), {
        totalSpent: newTotalSpent
      });

      setActiveFestival({...activeFestival, totalSpent: newTotalSpent});
      fetchFestivalExpenses(activeFestival.id);
      
      resetExpenseForm();
    } catch (error) {
      console.error('Error adding festival expense:', error);
    }
  };

  const deleteFestival = async (festivalId) => {
    if (window.confirm('Are you sure you want to delete this festival? This will also delete all associated expenses.')) {
      try {
        const expensesQuery = query(
          collection(db, 'festivalExpenses'),
          where('festivalId', '==', festivalId)
        );
        
        const expensesSnapshot = await getDocs(expensesQuery);
        const deletePromises = [];
        expensesSnapshot.forEach((expenseDoc) => {
          deletePromises.push(deleteDoc(doc(db, 'festivalExpenses', expenseDoc.id)));
        });
        
        await Promise.all(deletePromises);
        
        await deleteDoc(doc(db, 'festivals', festivalId));
        
        const updatedFestivals = festivals.filter(f => f.id !== festivalId);
        setFestivals(updatedFestivals);
        setActiveFestival(updatedFestivals.length > 0 ? updatedFestivals[0] : null);
        setFestivalExpenses([]);
      } catch (error) {
        console.error('Error deleting festival:', error);
      }
    }
  };

  const deleteExpense = async (expenseId, amount) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'festivalExpenses', expenseId));
        
        const newTotalSpent = (activeFestival.totalSpent || 0) - amount;
        await updateDoc(doc(db, 'festivals', activeFestival.id), {
          totalSpent: Math.max(0, newTotalSpent)
        });

        setActiveFestival({...activeFestival, totalSpent: Math.max(0, newTotalSpent)});
        fetchFestivalExpenses(activeFestival.id);
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const resetFestivalForm = () => {
    setFestivalFormData({
      name: '',
      year: new Date().getFullYear(),
      budget: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      description: ''
    });
    setShowAddForm(false);
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      amount: '',
      category: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm')
    });
    setShowExpenseForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getBudgetStatus = () => {
    if (!activeFestival) return { status: 'unknown', percentage: 0 };
    
    const spent = activeFestival.totalSpent || 0;
    const budget = activeFestival.budget || 0;
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    
    let status = 'on-track';
    if (percentage >= 100) status = 'over-budget';
    else if (percentage >= 80) status = 'warning';
    
    return { status, percentage: Math.min(percentage, 100) };
  };

  const getCategoryBreakdown = () => {
    const categoryMap = {};
    festivalExpenses.forEach(expense => {
      categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
    });
    
    return Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getCategoryColor = (index) => {
    const colors = ['#f093fb', '#f6d55c', '#3dccc7', '#20bf6b', '#eb4d4b', '#6c5ce7', '#fd79a8', '#fdcb6e'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="festival-loading">
        <div className="loading-spinner"></div>
        <p>Loading festivals...</p>
      </div>
    );
  }

  const budgetStatus = getBudgetStatus();
  const categoryBreakdown = getCategoryBreakdown();

  return (
    <div className="festival-mode">
      <div className="festival-header">
        <div className="header-content">
          <h1>🎉 Festival Mode</h1>
          <p>Track your festival expenses and compare with previous years</p>
        </div>
        <button 
          className="add-festival-btn"
          onClick={() => setShowAddForm(true)}
        >
          <Plus />
          New Festival
        </button>
      </div>

      {festivals.length > 0 && (
        <div className="festival-tabs">
          {festivals.map((festival) => (
            <div
              key={festival.id}
              className={`festival-tab ${activeFestival?.id === festival.id ? 'active' : ''}`}
              onClick={() => setActiveFestival(festival)}
            >
              <div className="tab-content">
                <h3>{festival.name}</h3>
                <p>{festival.year}</p>
                <span className="tab-amount">
                  {formatCurrency(festival.totalSpent || 0)} / {formatCurrency(festival.budget)}
                </span>
              </div>
              <button
                className="delete-festival"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFestival(festival.id);
                }}
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeFestival ? (
        <div className="festival-dashboard">
          <div className="budget-overview">
            <div className="budget-card">
              <div className="budget-header">
                <h3>{activeFestival.name} {activeFestival.year}</h3>
                <div className={`budget-status ${budgetStatus.status}`}>
                  {budgetStatus.status === 'over-budget' ? (
                    <><TrendingUp /> Over Budget</>
                  ) : budgetStatus.status === 'warning' ? (
                    <><Target /> Near Limit</>
                  ) : (
                    <><TrendingDown /> On Track</>
                  )}
                </div>
              </div>
              
              <div className="budget-progress">
                <div className="progress-bar">
                  <div 
                    className={`progress-fill ${budgetStatus.status}`}
                    style={{ width: `${budgetStatus.percentage}%` }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span>Spent: {formatCurrency(activeFestival.totalSpent || 0)}</span>
                  <span>Budget: {formatCurrency(activeFestival.budget)}</span>
                </div>
              </div>

              <div className="budget-stats">
                <div className="stat">
                  <DollarSign className="stat-icon" />
                  <div>
                    <p>Remaining</p>
                    <span className={activeFestival.budget - (activeFestival.totalSpent || 0) >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(activeFestival.budget - (activeFestival.totalSpent || 0))}
                    </span>
                  </div>
                </div>
                <div className="stat">
                  <Gift className="stat-icon" />
                  <div>
                    <p>Total Expenses</p>
                    <span>{festivalExpenses.length}</span>
                  </div>
                </div>
              </div>

              {activeFestival.description && (
                <p className="festival-description">{activeFestival.description}</p>
              )}
            </div>

            <button 
              className="add-expense-btn"
              onClick={() => setShowExpenseForm(true)}
            >
              <Plus />
              Add Expense
            </button>
          </div>

          <div className="charts-section">
            {categoryBreakdown.length > 0 && (
              <div className="chart-card">
                <h3>Category Breakdown</h3>
                <div className="pie-chart-container">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="amount"
                        label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {yearlyComparison.length > 1 && (
              <div className="chart-card">
                <h3>Yearly Comparison</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={yearlyComparison}>
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="budget" fill="#667eea" name="Budget" />
                    <Bar dataKey="spent" fill="#f093fb" name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="expenses-section">
            <h3>Festival Expenses</h3>
            {festivalExpenses.length === 0 ? (
              <div className="no-expenses">
                <Sparkles className="no-expenses-icon" />
                <p>No expenses recorded yet</p>
                <button onClick={() => setShowExpenseForm(true)} className="add-first-expense">
                  Add your first expense
                </button>
              </div>
            ) : (
              <div className="expenses-list">
                {festivalExpenses.map((expense) => (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-info">
                      <h4>{expense.description}</h4>
                      <div className="expense-meta">
                        <span className="category">{expense.category}</span>
                        <span className="date">
                          {format(expense.date.toDate(), 'MMM dd, yyyy • HH:mm')}
                        </span>
                      </div>
                    </div>
                    <div className="expense-actions">
                      <span className="amount">{formatCurrency(expense.amount)}</span>
                      <button
                        onClick={() => deleteExpense(expense.id, expense.amount)}
                        className="delete-btn"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-festivals">
          <Star className="no-festivals-icon" />
          <h2>No festivals created yet</h2>
          <p>Create your first festival budget to start tracking expenses</p>
          <button onClick={() => setShowAddForm(true)} className="create-first-festival">
            Create Your First Festival
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="form-overlay">
          <div className="festival-form">
            <div className="form-header">
              <h3>Create New Festival</h3>
              <button className="close-btn" onClick={resetFestivalForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleFestivalSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Festival Name</label>
                  <select
                    value={festivalFormData.name}
                    onChange={(e) => setFestivalFormData({...festivalFormData, name: e.target.value})}
                    required
                  >
                    <option value="">Select Festival</option>
                    {popularFestivals.map(festival => (
                      <option key={festival} value={festival}>{festival}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    value={festivalFormData.year}
                    onChange={(e) => setFestivalFormData({...festivalFormData, year: e.target.value})}
                    min={new Date().getFullYear() - 5}
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Budget (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={festivalFormData.budget}
                    onChange={(e) => setFestivalFormData({...festivalFormData, budget: e.target.value})}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={festivalFormData.startDate}
                    onChange={(e) => setFestivalFormData({...festivalFormData, startDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={festivalFormData.endDate}
                    onChange={(e) => setFestivalFormData({...festivalFormData, endDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description (Optional)</label>
                  <textarea
                    value={festivalFormData.description}
                    onChange={(e) => setFestivalFormData({...festivalFormData, description: e.target.value})}
                    placeholder="Add some notes about this festival..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetFestivalForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Create Festival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseForm && (
        <div className="form-overlay">
          <div className="expense-form">
            <div className="form-header">
              <h3>Add Festival Expense</h3>
              <button className="close-btn" onClick={resetExpenseForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseFormData.amount}
                    onChange={(e) => setExpenseFormData({...expenseFormData, amount: e.target.value})}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({...expenseFormData, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {festivalCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={expenseFormData.date}
                    onChange={(e) => setExpenseFormData({...expenseFormData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={expenseFormData.time}
                    onChange={(e) => setExpenseFormData({...expenseFormData, time: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <input
                    type="text"
                    value={expenseFormData.description}
                    onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
                    placeholder="e.g., Rangoli decorations, Sweets for family..."
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetExpenseForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivalMode;
