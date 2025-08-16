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
  Users,
  Plus,
  Edit3,
  Trash2,
  UserPlus,
  PieChart,
  BarChart3,
  Target,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import './FamilyExpenses.css';

const FamilyExpenses = () => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyExpenses, setFamilyExpenses] = useState([]);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');

  const { currentUser } = useAuth();

  const [memberFormData, setMemberFormData] = useState({
    name: '',
    relation: '',
    avatar: '👤',
    monthlyBudget: ''
  });

  const [expenseFormData, setExpenseFormData] = useState({
    amount: '',
    category: '',
    description: '',
    memberId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    paymentMode: 'Cash'
  });

  const relations = [
    'Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter',
    'Husband', 'Wife', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt',
    'Cousin', 'Friend', 'Roommate', 'Partner', 'Other'
  ];

  const avatars = [
    '👤', '👨', '👩', '👴', '👵', '👶', '👦', '👧', '🧑', '👨‍💼',
    '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍⚕️', '👩‍⚕️', '👨‍🍳', '👩‍🍳'
  ];

  const categories = [
    'Food', 'Shopping', 'Entertainment', 'Travel', 'Health',
    'Education', 'Bills', 'Personal Care', 'Gifts', 'Other'
  ];

  const paymentModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallet'];

  useEffect(() => {
    if (currentUser) {
      fetchFamilyMembers();
      fetchFamilyExpenses();
    }
  }, [currentUser, selectedPeriod]);

  const fetchFamilyMembers = async () => {
    try {
      const q = query(
        collection(db, 'familyMembers'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
      );

      const querySnapshot = await getDocs(q);
      const membersList = [];
      querySnapshot.forEach((doc) => {
        membersList.push({ id: doc.id, ...doc.data() });
      });

      setFamilyMembers(membersList);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const fetchFamilyExpenses = async () => {
    try {
      let startDate, endDate;
      const now = new Date();

      switch (selectedPeriod) {
        case 'current-month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        case 'last-month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          break;
        case 'last-3-months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      const q = query(
        collection(db, 'familyExpenses'),
        where('userId', '==', currentUser.uid),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const expensesList = [];
      querySnapshot.forEach((doc) => {
        expensesList.push({ id: doc.id, ...doc.data() });
      });

      setFamilyExpenses(expensesList);
    } catch (error) {
      console.error('Error fetching family expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const memberData = {
        ...memberFormData,
        monthlyBudget: parseFloat(memberFormData.monthlyBudget) || 0,
        userId: currentUser.uid,
        totalSpent: 0,
        createdAt: Timestamp.now()
      };

      if (editingMember) {
        await updateDoc(doc(db, 'familyMembers', editingMember.id), memberData);
      } else {
        await addDoc(collection(db, 'familyMembers'), memberData);
      }

      resetMemberForm();
      fetchFamilyMembers();
    } catch (error) {
      console.error('Error saving family member:', error);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const expenseData = {
        ...expenseFormData,
        amount: parseFloat(expenseFormData.amount),
        date: Timestamp.fromDate(new Date(`${expenseFormData.date}T${expenseFormData.time}`)),
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'familyExpenses'), expenseData);
      
      const member = familyMembers.find(m => m.id === expenseFormData.memberId);
      if (member) {
        const newTotalSpent = (member.totalSpent || 0) + expenseData.amount;
        await updateDoc(doc(db, 'familyMembers', member.id), {
          totalSpent: newTotalSpent
        });
      }

      resetExpenseForm();
      fetchFamilyMembers();
      fetchFamilyExpenses();
    } catch (error) {
      console.error('Error adding family expense:', error);
    }
  };

  const deleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this family member? This will also delete all their associated expenses.')) {
      try {
        const expensesQuery = query(
          collection(db, 'familyExpenses'),
          where('memberId', '==', memberId)
        );
        
        const expensesSnapshot = await getDocs(expensesQuery);
        const deletePromises = [];
        expensesSnapshot.forEach((expenseDoc) => {
          deletePromises.push(deleteDoc(doc(db, 'familyExpenses', expenseDoc.id)));
        });
        
        await Promise.all(deletePromises);
        
        await deleteDoc(doc(db, 'familyMembers', memberId));
        
        fetchFamilyMembers();
        fetchFamilyExpenses();
      } catch (error) {
        console.error('Error deleting family member:', error);
      }
    }
  };

  const deleteExpense = async (expenseId, amount, memberId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'familyExpenses', expenseId));
        
        const member = familyMembers.find(m => m.id === memberId);
        if (member) {
          const newTotalSpent = Math.max(0, (member.totalSpent || 0) - amount);
          await updateDoc(doc(db, 'familyMembers', member.id), {
            totalSpent: newTotalSpent
          });
        }

        fetchFamilyMembers();
        fetchFamilyExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const editMember = (member) => {
    setEditingMember(member);
    setMemberFormData({
      name: member.name,
      relation: member.relation,
      avatar: member.avatar,
      monthlyBudget: member.monthlyBudget.toString()
    });
    setShowAddMemberForm(true);
  };

  const resetMemberForm = () => {
    setMemberFormData({
      name: '',
      relation: '',
      avatar: '👤',
      monthlyBudget: ''
    });
    setShowAddMemberForm(false);
    setEditingMember(null);
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      amount: '',
      category: '',
      description: '',
      memberId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      paymentMode: 'Cash'
    });
    setShowAddExpenseForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getMemberSpendingData = () => {
    return familyMembers
      .filter(member => member.totalSpent > 0)
      .map(member => ({
        name: member.name,
        spent: member.totalSpent || 0,
        budget: member.monthlyBudget || 0
      }))
      .sort((a, b) => b.spent - a.spent);
  };

  const getCategoryBreakdown = () => {
    const categoryMap = {};
    familyExpenses.forEach(expense => {
      categoryMap[expense.category] = (categoryMap[expense.category] || 0) + expense.amount;
    });
    
    return Object.entries(categoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const getTotalFamilySpent = () => {
    return familyExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getMemberName = (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? member.name : 'Unknown';
  };

  const getMemberAvatar = (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? member.avatar : '👤';
  };

  const getColorForIndex = (index) => {
    const colors = ['#667eea', '#f093fb', '#f6d55c', '#3dccc7', '#20bf6b', '#eb4d4b', '#6c5ce7', '#fd79a8'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="family-loading">
        <div className="loading-spinner"></div>
        <p>Loading family data...</p>
      </div>
    );
  }

  const memberSpendingData = getMemberSpendingData();
  const categoryBreakdown = getCategoryBreakdown();
  const totalFamilySpent = getTotalFamilySpent();

  return (
    <div className="family-expenses">
      <div className="family-header">
        <div className="header-content">
          <h1>👨‍👩‍👧‍👦 Family Expenses</h1>
          <p>Track and manage expenses for your family members</p>
        </div>
        <div className="header-actions">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="current-month">Current Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
          </select>
          <button 
            className="add-member-btn"
            onClick={() => setShowAddMemberForm(true)}
          >
            <UserPlus />
            Add Member
          </button>
        </div>
      </div>

      <div className="family-overview">
        <div className="overview-card">
          <div className="overview-header">
            <Users className="overview-icon" />
            <div>
              <h3>Total Family Members</h3>
              <p className="overview-value">{familyMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <BarChart3 className="overview-icon" />
            <div>
              <h3>Total Spent</h3>
              <p className="overview-value">{formatCurrency(totalFamilySpent)}</p>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-header">
            <Target className="overview-icon" />
            <div>
              <h3>Average per Member</h3>
              <p className="overview-value">
                {formatCurrency(familyMembers.length > 0 ? totalFamilySpent / familyMembers.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="family-members-section">
        <div className="section-header">
          <h2>Family Members</h2>
          {familyExpenses.length > 0 && (
            <button 
              className="add-expense-btn"
              onClick={() => setShowAddExpenseForm(true)}
            >
              <Plus />
              Add Expense
            </button>
          )}
        </div>

        {familyMembers.length === 0 ? (
          <div className="no-members">
            <Heart className="no-members-icon" />
            <h3>No family members added yet</h3>
            <p>Start by adding your family members to track their expenses</p>
            <button onClick={() => setShowAddMemberForm(true)} className="add-first-member">
              Add Your First Family Member
            </button>
          </div>
        ) : (
          <div className="members-grid">
            {familyMembers.map((member) => {
              const spentPercentage = member.monthlyBudget > 0 
                ? Math.min((member.totalSpent / member.monthlyBudget) * 100, 100)
                : 0;
              
              return (
                <div key={member.id} className="member-card">
                  <div className="member-header">
                    <div className="member-info">
                      <div className="member-avatar">{member.avatar}</div>
                      <div className="member-details">
                        <h4>{member.name}</h4>
                        <p>{member.relation}</p>
                      </div>
                    </div>
                    <div className="member-actions">
                      <button 
                        onClick={() => editMember(member)}
                        className="edit-btn"
                      >
                        <Edit3 />
                      </button>
                      <button 
                        onClick={() => deleteMember(member.id)}
                        className="delete-btn"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>

                  <div className="member-spending">
                    <div className="spending-header">
                      <span className="spent-amount">{formatCurrency(member.totalSpent || 0)}</span>
                      {member.monthlyBudget > 0 && (
                        <span className="budget-amount">/ {formatCurrency(member.monthlyBudget)}</span>
                      )}
                    </div>
                    
                    {member.monthlyBudget > 0 && (
                      <div className="progress-bar">
                        <div 
                          className={`progress-fill ${spentPercentage >= 100 ? 'over-budget' : spentPercentage >= 80 ? 'warning' : 'on-track'}`}
                          style={{ width: `${spentPercentage}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="spending-stats">
                      <span className={`percentage ${spentPercentage >= 100 ? 'over' : ''}`}>
                        {member.monthlyBudget > 0 ? `${spentPercentage.toFixed(1)}% of budget` : 'No budget set'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {memberSpendingData.length > 0 && (
        <div className="charts-section">
          <div className="chart-card">
            <h3>Member Spending Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={memberSpendingData}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="spent" fill="#f093fb" name="Spent" />
                <Bar dataKey="budget" fill="#667eea" name="Budget" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {categoryBreakdown.length > 0 && (
            <div className="chart-card">
              <h3>Category Breakdown</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColorForIndex(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {familyExpenses.length > 0 && (
        <div className="recent-expenses-section">
          <h3>Recent Family Expenses</h3>
          <div className="expenses-list">
            {familyExpenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-member">
                  <span className="member-avatar">{getMemberAvatar(expense.memberId)}</span>
                  <span className="member-name">{getMemberName(expense.memberId)}</span>
                </div>
                
                <div className="expense-details">
                  <h4>{expense.description}</h4>
                  <div className="expense-meta">
                    <span className="category">{expense.category}</span>
                    <span className="date">
                      {format(expense.date.toDate(), 'MMM dd, yyyy • HH:mm')}
                    </span>
                    <span className="payment-mode">{expense.paymentMode}</span>
                  </div>
                </div>

                <div className="expense-actions">
                  <span className="amount">{formatCurrency(expense.amount)}</span>
                  <button
                    onClick={() => deleteExpense(expense.id, expense.amount, expense.memberId)}
                    className="delete-btn"
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddMemberForm && (
        <div className="form-overlay">
          <div className="member-form">
            <div className="form-header">
              <h3>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</h3>
              <button className="close-btn" onClick={resetMemberForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleMemberSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={memberFormData.name}
                    onChange={(e) => setMemberFormData({...memberFormData, name: e.target.value})}
                    required
                    placeholder="Enter member name"
                  />
                </div>

                <div className="form-group">
                  <label>Relation</label>
                  <select
                    value={memberFormData.relation}
                    onChange={(e) => setMemberFormData({...memberFormData, relation: e.target.value})}
                    required
                  >
                    <option value="">Select Relation</option>
                    {relations.map(relation => (
                      <option key={relation} value={relation}>{relation}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Avatar</label>
                  <div className="avatar-selector">
                    {avatars.map(avatar => (
                      <button
                        key={avatar}
                        type="button"
                        className={`avatar-option ${memberFormData.avatar === avatar ? 'selected' : ''}`}
                        onClick={() => setMemberFormData({...memberFormData, avatar})}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Monthly Budget (₹) - Optional</label>
                  <input
                    type="number"
                    step="0.01"
                    value={memberFormData.monthlyBudget}
                    onChange={(e) => setMemberFormData({...memberFormData, monthlyBudget: e.target.value})}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetMemberForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingMember ? 'Update Member' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseForm && (
        <div className="form-overlay">
          <div className="expense-form">
            <div className="form-header">
              <h3>Add Family Expense</h3>
              <button className="close-btn" onClick={resetExpenseForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Family Member</label>
                  <select
                    value={expenseFormData.memberId}
                    onChange={(e) => setExpenseFormData({...expenseFormData, memberId: e.target.value})}
                    required
                  >
                    <option value="">Select Member</option>
                    {familyMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.avatar} {member.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Mode</label>
                  <select
                    value={expenseFormData.paymentMode}
                    onChange={(e) => setExpenseFormData({...expenseFormData, paymentMode: e.target.value})}
                    required
                  >
                    {paymentModes.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
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
                    required
                    placeholder="e.g., Lunch at restaurant, Shopping for clothes..."
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

export default FamilyExpenses;
