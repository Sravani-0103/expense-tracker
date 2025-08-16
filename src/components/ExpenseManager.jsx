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
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import './ExpenseManager.css';

const ExpenseManager = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    paymentMode: '',
    type: 'expense',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    notes: '',
    isRecurring: false,
    recurringPeriod: 'monthly',
    familyMember: ''
  });

  const categories = [
    'Food', 'Rent', 'Travel', 'Bills', 'Shopping', 'Education', 
    'Health', 'Entertainment', 'Fuel', 'Groceries', 'Medical',
    'Insurance', 'Investment', 'Salary', 'Business', 'Gift', 'Other'
  ];

  const paymentModes = ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Wallet'];

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
    }
  }, [currentUser]);

  const fetchExpenses = async () => {
    try {
      const q = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const expensesList = [];
      querySnapshot.forEach((doc) => {
        expensesList.push({ id: doc.id, ...doc.data() });
      });

      setExpenses(expensesList);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: Timestamp.fromDate(new Date(`${formData.date}T${formData.time}`)),
        userId: currentUser.uid,
        createdAt: Timestamp.now()
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), expenseData);
        setEditingExpense(null);
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
        
        if (formData.isRecurring) {
          await handleRecurringExpense(expenseData);
        }
      }

      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleRecurringExpense = async (expenseData) => {
    const periodsToCreate = 12;
    const currentDate = new Date(expenseData.date.toDate());
    
    for (let i = 1; i <= periodsToCreate; i++) {
      const nextDate = new Date(currentDate);
      
      switch (formData.recurringPeriod) {
        case 'daily':
          nextDate.setDate(currentDate.getDate() + i);
          break;
        case 'weekly':
          nextDate.setDate(currentDate.getDate() + (i * 7));
          break;
        case 'monthly':
          nextDate.setMonth(currentDate.getMonth() + i);
          break;
        case 'yearly':
          nextDate.setFullYear(currentDate.getFullYear() + i);
          break;
      }

      const recurringExpenseData = {
        ...expenseData,
        date: Timestamp.fromDate(nextDate),
        isRecurring: true,
        originalRecurringId: expenseData.id
      };

      await addDoc(collection(db, 'expenses'), recurringExpenseData);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      paymentMode: expense.paymentMode,
      type: expense.type,
      date: format(expense.date.toDate(), 'yyyy-MM-dd'),
      time: format(expense.date.toDate(), 'HH:mm'),
      notes: expense.notes || '',
      isRecurring: expense.isRecurring || false,
      recurringPeriod: expense.recurringPeriod || 'monthly',
      familyMember: expense.familyMember || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseId));
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      category: '',
      paymentMode: '',
      type: 'expense',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      notes: '',
      isRecurring: false,
      recurringPeriod: 'monthly',
      familyMember: ''
    });
    setShowAddForm(false);
    setEditingExpense(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || expense.category === filterCategory;
    const matchesPaymentMode = !filterPaymentMode || expense.paymentMode === filterPaymentMode;
    const matchesType = !filterType || expense.type === filterType;

    return matchesSearch && matchesCategory && matchesPaymentMode && matchesType;
  });

  if (loading) {
    return (
      <div className="expense-manager-loading">
        <div className="loading-spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="expense-manager">
      <div className="expense-manager-header">
        <div>
          <h1>Expense Manager</h1>
          <p>Track your income and expenses efficiently</p>
        </div>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(true)}
        >
          <Plus />
          Add Transaction
        </button>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>

          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select 
            value={filterPaymentMode}
            onChange={(e) => setFilterPaymentMode(e.target.value)}
            className="filter-select"
          >
            <option value="">All Payment Modes</option>
            {paymentModes.map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>

          <button 
            className="clear-filters"
            onClick={() => {
              setSearchTerm('');
              setFilterCategory('');
              setFilterPaymentMode('');
              setFilterType('');
            }}
          >
            <X />
            Clear
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="form-overlay">
          <div className="expense-form">
            <div className="form-header">
              <h3>{editingExpense ? 'Edit Transaction' : 'Add New Transaction'}</h3>
              <button className="close-btn" onClick={resetForm}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
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
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({...formData, paymentMode: e.target.value})}
                    required
                  >
                    <option value="">Select Payment Mode</option>
                    {paymentModes.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="e.g., Chai at railway station"
                  />
                </div>

                <div className="form-group checkbox-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    Recurring Transaction
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="form-group">
                    <label>Recurring Period</label>
                    <select
                      value={formData.recurringPeriod}
                      onChange={(e) => setFormData({...formData, recurringPeriod: e.target.value})}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <Save />
                  {editingExpense ? 'Update' : 'Save'} Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="expenses-list">
        {filteredExpenses.length === 0 ? (
          <div className="no-expenses">
            <p>No transactions found</p>
            <button onClick={() => setShowAddForm(true)} className="add-first-btn">
              Add your first transaction
            </button>
          </div>
        ) : (
          <div className="expenses-grid">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className={`expense-card ${expense.type}`}>
                <div className="expense-header">
                  <div className="expense-amount">
                    <span className={`amount ${expense.type}`}>
                      {expense.type === 'expense' ? '-' : '+'}
                      {formatCurrency(expense.amount)}
                    </span>
                    <span className="category">{expense.category}</span>
                  </div>
                  <div className="expense-actions">
                    <button 
                      onClick={() => handleEdit(expense)}
                      className="edit-btn"
                    >
                      <Edit3 />
                    </button>
                    <button 
                      onClick={() => handleDelete(expense.id)}
                      className="delete-btn"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>

                <div className="expense-details">
                  <div className="expense-meta">
                    <span className="payment-mode">{expense.paymentMode}</span>
                    <span className="date">
                      <Calendar />
                      {format(expense.date.toDate(), 'MMM dd, yyyy • HH:mm')}
                    </span>
                  </div>
                  
                  {expense.notes && (
                    <p className="expense-notes">{expense.notes}</p>
                  )}

                  {expense.isRecurring && (
                    <div className="recurring-badge">
                      <RefreshCw />
                      Recurring ({expense.recurringPeriod})
                    </div>
                  )}

                  {expense.familyMember && (
                    <div className="family-member">
                      Tagged to: {expense.familyMember}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;
