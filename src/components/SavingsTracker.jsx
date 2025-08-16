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
  PiggyBank,
  Plus,
  Edit3,
  Trash2,
  Target,
  TrendingUp,
  Coins,
  Award,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './SavingsTracker.css';

const SavingsTracker = () => {
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [goldPurchases, setGoldPurchases] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [showAddGoldForm, setShowAddGoldForm] = useState(false);
  const [showAddInvestmentForm, setShowAddInvestmentForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentGoldRate, setCurrentGoldRate] = useState(6500); // Default gold rate per gram

  const { currentUser } = useAuth();

  const [goalFormData, setGoalFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    category: '',
    targetDate: '',
    description: ''
  });

  const [goldFormData, setGoldFormData] = useState({
    grams: '',
    ratePerGram: currentGoldRate,
    totalCost: '',
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    jeweler: '',
    purity: '22k',
    notes: ''
  });

  const [investmentFormData, setInvestmentFormData] = useState({
    type: '',
    name: '',
    amount: '',
    investmentDate: format(new Date(), 'yyyy-MM-dd'),
    expectedReturns: '',
    maturityDate: '',
    description: ''
  });

  const goalCategories = [
    'Emergency Fund', 'House Down Payment', 'Car Purchase', 'Vacation',
    'Education', 'Retirement', 'Wedding', 'Business', 'Health', 'Other'
  ];

  const investmentTypes = [
    'SIP', 'Fixed Deposit', 'Chit Fund', 'PPF', 'NSC', 'ELSS',
    'Stocks', 'Bonds', 'Real Estate', 'Cryptocurrency', 'Other'
  ];

  const goldPurities = ['24k', '22k', '18k', '14k'];

  useEffect(() => {
    if (currentUser) {
      fetchSavingsData();
    }
  }, [currentUser]);

  const fetchSavingsData = async () => {
    try {
      await Promise.all([
        fetchSavingsGoals(),
        fetchGoldPurchases(),
        fetchInvestments()
      ]);
    } catch (error) {
      console.error('Error fetching savings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavingsGoals = async () => {
    const q = query(
      collection(db, 'savingsGoals'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const goalsList = [];
    querySnapshot.forEach((doc) => {
      goalsList.push({ id: doc.id, ...doc.data() });
    });

    setSavingsGoals(goalsList);
  };

  const fetchGoldPurchases = async () => {
    const q = query(
      collection(db, 'goldPurchases'),
      where('userId', '==', currentUser.uid),
      orderBy('purchaseDate', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const goldList = [];
    querySnapshot.forEach((doc) => {
      goldList.push({ id: doc.id, ...doc.data() });
    });

    setGoldPurchases(goldList);
  };

  const fetchInvestments = async () => {
    const q = query(
      collection(db, 'investments'),
      where('userId', '==', currentUser.uid),
      orderBy('investmentDate', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const investmentsList = [];
    querySnapshot.forEach((doc) => {
      investmentsList.push({ id: doc.id, ...doc.data() });
    });

    setInvestments(investmentsList);
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const goalData = {
        ...goalFormData,
        targetAmount: parseFloat(goalFormData.targetAmount),
        currentAmount: parseFloat(goalFormData.currentAmount) || 0,
        targetDate: goalFormData.targetDate ? Timestamp.fromDate(new Date(goalFormData.targetDate)) : null,
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      };

      if (editingGoal) {
        await updateDoc(doc(db, 'savingsGoals', editingGoal.id), goalData);
      } else {
        await addDoc(collection(db, 'savingsGoals'), goalData);
      }

      resetGoalForm();
      fetchSavingsGoals();
    } catch (error) {
      console.error('Error saving savings goal:', error);
    }
  };

  const handleGoldSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const goldData = {
        ...goldFormData,
        grams: parseFloat(goldFormData.grams),
        ratePerGram: parseFloat(goldFormData.ratePerGram),
        totalCost: parseFloat(goldFormData.totalCost),
        purchaseDate: Timestamp.fromDate(new Date(goldFormData.purchaseDate)),
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'goldPurchases'), goldData);
      resetGoldForm();
      fetchGoldPurchases();
    } catch (error) {
      console.error('Error saving gold purchase:', error);
    }
  };

  const handleInvestmentSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const investmentData = {
        ...investmentFormData,
        amount: parseFloat(investmentFormData.amount),
        expectedReturns: parseFloat(investmentFormData.expectedReturns) || 0,
        investmentDate: Timestamp.fromDate(new Date(investmentFormData.investmentDate)),
        maturityDate: investmentFormData.maturityDate ? 
          Timestamp.fromDate(new Date(investmentFormData.maturityDate)) : null,
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'investments'), investmentData);
      resetInvestmentForm();
      fetchInvestments();
    } catch (error) {
      console.error('Error saving investment:', error);
    }
  };

  const updateGoalProgress = async (goalId, newAmount) => {
    try {
      await updateDoc(doc(db, 'savingsGoals', goalId), {
        currentAmount: newAmount
      });
      fetchSavingsGoals();
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const deleteGoal = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this savings goal?')) {
      try {
        await deleteDoc(doc(db, 'savingsGoals', goalId));
        fetchSavingsGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
      }
    }
  };

  const deleteGoldPurchase = async (goldId) => {
    if (window.confirm('Are you sure you want to delete this gold purchase?')) {
      try {
        await deleteDoc(doc(db, 'goldPurchases', goldId));
        fetchGoldPurchases();
      } catch (error) {
        console.error('Error deleting gold purchase:', error);
      }
    }
  };

  const deleteInvestment = async (investmentId) => {
    if (window.confirm('Are you sure you want to delete this investment?')) {
      try {
        await deleteDoc(doc(db, 'investments', investmentId));
        fetchInvestments();
      } catch (error) {
        console.error('Error deleting investment:', error);
      }
    }
  };

  const editGoal = (goal) => {
    setEditingGoal(goal);
    setGoalFormData({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      currentAmount: goal.currentAmount.toString(),
      category: goal.category,
      targetDate: goal.targetDate ? format(goal.targetDate.toDate(), 'yyyy-MM-dd') : '',
      description: goal.description || ''
    });
    setShowAddGoalForm(true);
  };

  const resetGoalForm = () => {
    setGoalFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      category: '',
      targetDate: '',
      description: ''
    });
    setShowAddGoalForm(false);
    setEditingGoal(null);
  };

  const resetGoldForm = () => {
    setGoldFormData({
      grams: '',
      ratePerGram: currentGoldRate,
      totalCost: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      jeweler: '',
      purity: '22k',
      notes: ''
    });
    setShowAddGoldForm(false);
  };

  const resetInvestmentForm = () => {
    setInvestmentFormData({
      type: '',
      name: '',
      amount: '',
      investmentDate: format(new Date(), 'yyyy-MM-dd'),
      expectedReturns: '',
      maturityDate: '',
      description: ''
    });
    setShowAddInvestmentForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100);
  };

  const getTotalSavings = () => {
    return savingsGoals.reduce((total, goal) => total + goal.currentAmount, 0);
  };

  const getTotalGoldValue = () => {
    return goldPurchases.reduce((total, purchase) => total + purchase.totalCost, 0);
  };

  const getTotalGoldGrams = () => {
    return goldPurchases.reduce((total, purchase) => total + purchase.grams, 0);
  };

  const getTotalInvestments = () => {
    return investments.reduce((total, investment) => total + investment.amount, 0);
  };

  const getInvestmentBreakdown = () => {
    const typeMap = {};
    investments.forEach(investment => {
      typeMap[investment.type] = (typeMap[investment.type] || 0) + investment.amount;
    });
    
    return Object.entries(typeMap)
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getColorForIndex = (index) => {
    const colors = ['#20bf6b', '#3dccc7', '#667eea', '#f093fb', '#f6d55c', '#eb4d4b', '#6c5ce7', '#fd79a8'];
    return colors[index % colors.length];
  };

  const handleGoldCalculation = (field, value) => {
    const newFormData = { ...goldFormData, [field]: value };
    
    if (field === 'grams' || field === 'ratePerGram') {
      const grams = parseFloat(newFormData.grams) || 0;
      const rate = parseFloat(newFormData.ratePerGram) || 0;
      newFormData.totalCost = (grams * rate).toString();
    }
    
    setGoldFormData(newFormData);
  };

  if (loading) {
    return (
      <div className="savings-loading">
        <div className="loading-spinner"></div>
        <p>Loading savings data...</p>
      </div>
    );
  }

  const totalSavings = getTotalSavings();
  const totalGoldValue = getTotalGoldValue();
  const totalGoldGrams = getTotalGoldGrams();
  const totalInvestments = getTotalInvestments();
  const investmentBreakdown = getInvestmentBreakdown();

  return (
    <div className="savings-tracker">
      <div className="savings-header">
        <div className="header-content">
          <h1>🏦 Savings & Gold Tracker</h1>
          <p>Track your savings goals, gold purchases, and investments</p>
        </div>
      </div>

      <div className="overview-section">
        <div className="overview-card savings">
          <div className="card-icon">
            <Target />
          </div>
          <div className="card-content">
            <h3>Total Savings</h3>
            <p className="amount">{formatCurrency(totalSavings)}</p>
            <span className="sub-text">{savingsGoals.length} goals</span>
          </div>
        </div>

        <div className="overview-card gold">
          <div className="card-icon">
            <Coins />
          </div>
          <div className="card-content">
            <h3>Gold Holdings</h3>
            <p className="amount">{totalGoldGrams.toFixed(2)}g</p>
            <span className="sub-text">{formatCurrency(totalGoldValue)}</span>
          </div>
        </div>

        <div className="overview-card investments">
          <div className="card-icon">
            <TrendingUp />
          </div>
          <div className="card-content">
            <h3>Investments</h3>
            <p className="amount">{formatCurrency(totalInvestments)}</p>
            <span className="sub-text">{investments.length} investments</span>
          </div>
        </div>

        <div className="overview-card total">
          <div className="card-icon">
            <Award />
          </div>
          <div className="card-content">
            <h3>Total Wealth</h3>
            <p className="amount">{formatCurrency(totalSavings + totalGoldValue + totalInvestments)}</p>
            <span className="sub-text">Savings + Gold + Investments</span>
          </div>
        </div>
      </div>

      <div className="goals-section">
        <div className="section-header">
          <h2>💰 Savings Goals</h2>
          <button 
            className="add-goal-btn"
            onClick={() => setShowAddGoalForm(true)}
          >
            <Plus />
            Add Goal
          </button>
        </div>

        {savingsGoals.length === 0 ? (
          <div className="no-goals">
            <Target className="no-goals-icon" />
            <h3>No savings goals yet</h3>
            <p>Set your first savings goal to start tracking your progress</p>
            <button onClick={() => setShowAddGoalForm(true)} className="create-first-goal">
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="goals-grid">
            {savingsGoals.map((goal) => {
              const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
              const remaining = goal.targetAmount - goal.currentAmount;
              const daysLeft = goal.targetDate ? 
                Math.ceil((goal.targetDate.toDate() - new Date()) / (1000 * 60 * 60 * 24)) : null;
              
              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-header">
                    <div className="goal-info">
                      <h4>{goal.name}</h4>
                      <p className="goal-category">{goal.category}</p>
                    </div>
                    <div className="goal-actions">
                      <button 
                        onClick={() => editGoal(goal)}
                        className="edit-btn"
                      >
                        <Edit3 />
                      </button>
                      <button 
                        onClick={() => deleteGoal(goal.id)}
                        className="delete-btn"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>

                  <div className="goal-progress">
                    <div className="progress-header">
                      <span className="current">{formatCurrency(goal.currentAmount)}</span>
                      <span className="target">/ {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${progress >= 100 ? 'completed' : progress >= 80 ? 'near-completion' : 'in-progress'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="progress-stats">
                      <span className="percentage">{progress.toFixed(1)}%</span>
                      {daysLeft !== null && (
                        <span className={`days-left ${daysLeft < 0 ? 'overdue' : daysLeft < 30 ? 'urgent' : ''}`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="goal-footer">
                    <span className="remaining">
                      {remaining > 0 ? `${formatCurrency(remaining)} to go` : 'Goal achieved! 🎉'}
                    </span>
                    
                    <div className="progress-update">
                      <input
                        type="number"
                        placeholder="Add amount"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            const newAmount = goal.currentAmount + parseFloat(e.target.value);
                            updateGoalProgress(goal.id, newAmount);
                            e.target.value = '';
                          }
                        }}
                        className="progress-input"
                      />
                      <span className="input-hint">Press Enter to add</span>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="goal-description">{goal.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="gold-section">
        <div className="section-header">
          <h2>🪙 Gold Purchases</h2>
          <button 
            className="add-gold-btn"
            onClick={() => setShowAddGoldForm(true)}
          >
            <Plus />
            Add Gold Purchase
          </button>
        </div>

        {goldPurchases.length === 0 ? (
          <div className="no-gold">
            <Coins className="no-gold-icon" />
            <h3>No gold purchases recorded</h3>
            <p>Start tracking your gold investments</p>
            <button onClick={() => setShowAddGoldForm(true)} className="add-first-gold">
              Record Your First Purchase
            </button>
          </div>
        ) : (
          <div className="gold-list">
            {goldPurchases.map((purchase) => (
              <div key={purchase.id} className="gold-item">
                <div className="gold-info">
                  <div className="gold-details">
                    <h4>{purchase.grams}g of {purchase.purity} Gold</h4>
                    <p className="gold-meta">
                      <span>Rate: {formatCurrency(purchase.ratePerGram)}/g</span>
                      <span>Date: {format(purchase.purchaseDate.toDate(), 'MMM dd, yyyy')}</span>
                      {purchase.jeweler && <span>From: {purchase.jeweler}</span>}
                    </p>
                    {purchase.notes && <p className="gold-notes">{purchase.notes}</p>}
                  </div>
                  <div className="gold-value">
                    <span className="total-cost">{formatCurrency(purchase.totalCost)}</span>
                    <span className="current-value">
                      Current: {formatCurrency(purchase.grams * currentGoldRate)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteGoldPurchase(purchase.id)}
                  className="delete-btn"
                >
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="investments-section">
        <div className="section-header">
          <h2>📈 Investments</h2>
          <button 
            className="add-investment-btn"
            onClick={() => setShowAddInvestmentForm(true)}
          >
            <Plus />
            Add Investment
          </button>
        </div>

        <div className="investments-content">
          {investmentBreakdown.length > 0 && (
            <div className="investment-chart">
              <h3>Investment Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={investmentBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    label={({ type, amount }) => `${type}: ${formatCurrency(amount)}`}
                  >
                    {investmentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColorForIndex(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {investments.length === 0 ? (
            <div className="no-investments">
              <TrendingUp className="no-investments-icon" />
              <h3>No investments recorded</h3>
              <p>Start tracking your SIPs, FDs, and other investments</p>
              <button onClick={() => setShowAddInvestmentForm(true)} className="add-first-investment">
                Add Your First Investment
              </button>
            </div>
          ) : (
            <div className="investments-list">
              {investments.map((investment) => (
                <div key={investment.id} className="investment-item">
                  <div className="investment-info">
                    <div className="investment-header">
                      <h4>{investment.name}</h4>
                      <span className="investment-type">{investment.type}</span>
                    </div>
                    <div className="investment-details">
                      <div className="investment-amount">
                        <DollarSign className="amount-icon" />
                        <span>{formatCurrency(investment.amount)}</span>
                      </div>
                      <div className="investment-date">
                        <Calendar className="date-icon" />
                        <span>{format(investment.investmentDate.toDate(), 'MMM dd, yyyy')}</span>
                      </div>
                      {investment.expectedReturns > 0 && (
                        <div className="expected-returns">
                          Expected: {investment.expectedReturns}% returns
                        </div>
                      )}
                      {investment.maturityDate && (
                        <div className="maturity-date">
                          Matures: {format(investment.maturityDate.toDate(), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                    {investment.description && (
                      <p className="investment-description">{investment.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteInvestment(investment.id)}
                    className="delete-btn"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddGoalForm && (
        <div className="form-overlay">
          <div className="goal-form">
            <div className="form-header">
              <h3>{editingGoal ? 'Edit Savings Goal' : 'Add New Savings Goal'}</h3>
              <button className="close-btn" onClick={resetGoalForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleGoalSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Goal Name</label>
                  <input
                    type="text"
                    value={goalFormData.name}
                    onChange={(e) => setGoalFormData({...goalFormData, name: e.target.value})}
                    required
                    placeholder="e.g., Emergency Fund, Vacation"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={goalFormData.category}
                    onChange={(e) => setGoalFormData({...goalFormData, category: e.target.value})}
                    required
                  >
                    <option value="">Select Category</option>
                    {goalCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalFormData.targetAmount}
                    onChange={(e) => setGoalFormData({...goalFormData, targetAmount: e.target.value})}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Current Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goalFormData.currentAmount}
                    onChange={(e) => setGoalFormData({...goalFormData, currentAmount: e.target.value})}
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>Target Date (Optional)</label>
                  <input
                    type="date"
                    value={goalFormData.targetDate}
                    onChange={(e) => setGoalFormData({...goalFormData, targetDate: e.target.value})}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description (Optional)</label>
                  <textarea
                    value={goalFormData.description}
                    onChange={(e) => setGoalFormData({...goalFormData, description: e.target.value})}
                    placeholder="Add some notes about this goal..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetGoalForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddGoldForm && (
        <div className="form-overlay">
          <div className="gold-form">
            <div className="form-header">
              <h3>Add Gold Purchase</h3>
              <button className="close-btn" onClick={resetGoldForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleGoldSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Weight (grams)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goldFormData.grams}
                    onChange={(e) => handleGoldCalculation('grams', e.target.value)}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Rate per gram (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goldFormData.ratePerGram}
                    onChange={(e) => handleGoldCalculation('ratePerGram', e.target.value)}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Total Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={goldFormData.totalCost}
                    onChange={(e) => setGoldFormData({...goldFormData, totalCost: e.target.value})}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Purity</label>
                  <select
                    value={goldFormData.purity}
                    onChange={(e) => setGoldFormData({...goldFormData, purity: e.target.value})}
                    required
                  >
                    {goldPurities.map(purity => (
                      <option key={purity} value={purity}>{purity}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    value={goldFormData.purchaseDate}
                    onChange={(e) => setGoldFormData({...goldFormData, purchaseDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Jeweler (Optional)</label>
                  <input
                    type="text"
                    value={goldFormData.jeweler}
                    onChange={(e) => setGoldFormData({...goldFormData, jeweler: e.target.value})}
                    placeholder="e.g., Kalyan Jewellers"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Notes (Optional)</label>
                  <textarea
                    value={goldFormData.notes}
                    onChange={(e) => setGoldFormData({...goldFormData, notes: e.target.value})}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetGoldForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Add Gold Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddInvestmentForm && (
        <div className="form-overlay">
          <div className="investment-form">
            <div className="form-header">
              <h3>Add Investment</h3>
              <button className="close-btn" onClick={resetInvestmentForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleInvestmentSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Investment Type</label>
                  <select
                    value={investmentFormData.type}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, type: e.target.value})}
                    required
                  >
                    <option value="">Select Type</option>
                    {investmentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Investment Name</label>
                  <input
                    type="text"
                    value={investmentFormData.name}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, name: e.target.value})}
                    required
                    placeholder="e.g., HDFC Equity Fund, Bank FD"
                  />
                </div>

                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={investmentFormData.amount}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, amount: e.target.value})}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Investment Date</label>
                  <input
                    type="date"
                    value={investmentFormData.investmentDate}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, investmentDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expected Returns (% p.a.) - Optional</label>
                  <input
                    type="number"
                    step="0.1"
                    value={investmentFormData.expectedReturns}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, expectedReturns: e.target.value})}
                    min="0"
                    placeholder="e.g., 12.5"
                  />
                </div>

                <div className="form-group">
                  <label>Maturity Date (Optional)</label>
                  <input
                    type="date"
                    value={investmentFormData.maturityDate}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, maturityDate: e.target.value})}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description (Optional)</label>
                  <textarea
                    value={investmentFormData.description}
                    onChange={(e) => setInvestmentFormData({...investmentFormData, description: e.target.value})}
                    placeholder="Additional details about this investment..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetInvestmentForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Add Investment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsTracker;
