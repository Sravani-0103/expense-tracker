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
  Calculator,
  Check,
  X,
  UserPlus,
  DollarSign,
  Share2,
  Send,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import './ExpenseSplitting.css';

const ExpenseSplitting = () => {
  const [groups, setGroups] = useState([]);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  const { currentUser } = useAuth();

  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    members: []
  });

  const [memberFormData, setMemberFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    paidBy: '',
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    splitType: 'equal',
    customSplits: {}
  });

  const splitTypes = [
    { value: 'equal', label: 'Split Equally' },
    { value: 'exact', label: 'Exact Amounts' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'shares', label: 'Shares' }
  ];

  const expenseCategories = [
    'Food & Dining', 'Transportation', 'Accommodation', 'Entertainment',
    'Shopping', 'Groceries', 'Bills', 'Travel', 'Other'
  ];

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchGroups(),
        fetchGroupExpenses()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    const q = query(
      collection(db, 'expenseGroups'),
      where('members', 'array-contains', {
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        email: currentUser.email
      }),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const groupsList = [];
    querySnapshot.forEach((doc) => {
      groupsList.push({ id: doc.id, ...doc.data() });
    });

    setGroups(groupsList);
    if (groupsList.length > 0 && !selectedGroup) {
      setSelectedGroup(groupsList[0]);
    }
  };

  const fetchGroupExpenses = async () => {
    if (!selectedGroup) return;

    const q = query(
      collection(db, 'groupExpenses'),
      where('groupId', '==', selectedGroup.id),
      orderBy('date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const expensesList = [];
    querySnapshot.forEach((doc) => {
      expensesList.push({ id: doc.id, ...doc.data() });
    });

    setGroupExpenses(expensesList);
  };

  useEffect(() => {
    if (selectedGroup && currentUser) {
      fetchGroupExpenses();
    }
  }, [selectedGroup]);

  const handleAddMember = () => {
    if (memberFormData.name.trim()) {
      const newMember = {
        id: Date.now().toString(),
        name: memberFormData.name,
        email: memberFormData.email,
        phone: memberFormData.phone
      };

      setGroupFormData({
        ...groupFormData,
        members: [...groupFormData.members, newMember]
      });

      setMemberFormData({
        name: '',
        email: '',
        phone: ''
      });
    }
  };

  const handleRemoveMember = (memberId) => {
    setGroupFormData({
      ...groupFormData,
      members: groupFormData.members.filter(member => member.id !== memberId)
    });
  };

  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const currentUserMember = {
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
        email: currentUser.email
      };

      const groupData = {
        ...groupFormData,
        members: [currentUserMember, ...groupFormData.members],
        createdBy: currentUser.uid,
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'expenseGroups'), groupData);
      const newGroup = { id: docRef.id, ...groupData };
      
      setGroups([newGroup, ...groups]);
      setSelectedGroup(newGroup);
      resetGroupForm();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedGroup) return;

    try {
      const totalAmount = parseFloat(expenseFormData.amount);
      let splits = {};

      switch (expenseFormData.splitType) {
        case 'equal':
          const equalAmount = totalAmount / selectedGroup.members.length;
          selectedGroup.members.forEach(member => {
            splits[member.id] = equalAmount;
          });
          break;
          
        case 'exact':
        case 'percentage':
        case 'shares':
          splits = expenseFormData.customSplits;
          break;
      }

      const expenseData = {
        ...expenseFormData,
        amount: totalAmount,
        date: Timestamp.fromDate(new Date(expenseFormData.date)),
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        splits,
        createdBy: currentUser.uid,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'groupExpenses'), expenseData);
      fetchGroupExpenses();
      resetExpenseForm();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'groupExpenses', expenseId));
        fetchGroupExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
      }
    }
  };

  const deleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group? All expenses will be lost.')) {
      try {
        await deleteDoc(doc(db, 'expenseGroups', groupId));
        
        const expensesQuery = query(
          collection(db, 'groupExpenses'),
          where('groupId', '==', groupId)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        
        const deletePromises = expensesSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);
        
        fetchData();
        setSelectedGroup(null);
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: '',
      description: '',
      members: []
    });
    setMemberFormData({
      name: '',
      email: '',
      phone: ''
    });
    setShowAddGroupForm(false);
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      description: '',
      amount: '',
      paidBy: '',
      category: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      splitType: 'equal',
      customSplits: {}
    });
    setShowAddExpenseForm(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const calculateBalances = () => {
    if (!selectedGroup || groupExpenses.length === 0) return {};

    const balances = {};
    
    selectedGroup.members.forEach(member => {
      balances[member.id] = {
        name: member.name,
        paid: 0,
        owes: 0,
        balance: 0
      };
    });

    groupExpenses.forEach(expense => {
      const paidBy = expense.paidBy;
      balances[paidBy].paid += expense.amount;

      Object.entries(expense.splits).forEach(([memberId, amount]) => {
        balances[memberId].owes += amount;
      });
    });

    Object.keys(balances).forEach(memberId => {
      balances[memberId].balance = balances[memberId].paid - balances[memberId].owes;
    });

    return balances;
  };

  const getSettlementSuggestions = () => {
    const balances = calculateBalances();
    const suggestions = [];
    
    const creditors = Object.entries(balances).filter(([_, balance]) => balance.balance > 0);
    const debtors = Object.entries(balances).filter(([_, balance]) => balance.balance < 0);

    creditors.forEach(([creditorId, creditorBalance]) => {
      debtors.forEach(([debtorId, debtorBalance]) => {
        if (Math.abs(debtorBalance.balance) > 0.01 && creditorBalance.balance > 0.01) {
          const amount = Math.min(creditorBalance.balance, Math.abs(debtorBalance.balance));
          
          suggestions.push({
            from: debtorBalance.name,
            to: creditorBalance.name,
            amount: amount
          });

          creditorBalance.balance -= amount;
          debtorBalance.balance += amount;
        }
      });
    });

    return suggestions;
  };

  const updateSplitAmount = (memberId, amount) => {
    setExpenseFormData({
      ...expenseFormData,
      customSplits: {
        ...expenseFormData.customSplits,
        [memberId]: parseFloat(amount) || 0
      }
    });
  };

  const getTotalCustomSplits = () => {
    return Object.values(expenseFormData.customSplits).reduce((sum, amount) => sum + (amount || 0), 0);
  };

  if (loading) {
    return (
      <div className="splitting-loading">
        <div className="loading-spinner"></div>
        <p>Loading groups...</p>
      </div>
    );
  }

  const balances = calculateBalances();
  const settlements = getSettlementSuggestions();

  return (
    <div className="expense-splitting">
      <div className="splitting-header">
        <div className="header-content">
          <h1>👥 Expense Splitting</h1>
          <p>Share expenses with friends and family</p>
        </div>

        <div className="header-actions">
          <button 
            className="add-group-btn"
            onClick={() => setShowAddGroupForm(true)}
          >
            <Plus />
            New Group
          </button>
        </div>
      </div>

      <div className="splitting-content">
        <div className="groups-sidebar">
          <h3>Your Groups</h3>
          {groups.length === 0 ? (
            <div className="no-groups">
              <Users className="no-groups-icon" />
              <p>No groups yet</p>
              <button onClick={() => setShowAddGroupForm(true)} className="create-group-btn">
                Create Your First Group
              </button>
            </div>
          ) : (
            <div className="groups-list">
              {groups.map((group) => (
                <div 
                  key={group.id} 
                  className={`group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="group-info">
                    <h4>{group.name}</h4>
                    <p>{group.members.length} members</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.id);
                    }}
                    className="delete-group-btn"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="main-content">
          {selectedGroup ? (
            <>
              <div className="group-header">
                <div className="group-title">
                  <h2>{selectedGroup.name}</h2>
                  <p>{selectedGroup.description}</p>
                </div>
                <button 
                  className="add-expense-btn"
                  onClick={() => setShowAddExpenseForm(true)}
                >
                  <Plus />
                  Add Expense
                </button>
              </div>

              <div className="group-members">
                <h3>👥 Members ({selectedGroup.members.length})</h3>
                <div className="members-grid">
                  {selectedGroup.members.map((member) => (
                    <div key={member.id} className="member-card">
                      <div className="member-avatar">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <h4>{member.name}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(balances).length > 0 && (
                <div className="balances-section">
                  <h3>💰 Balances</h3>
                  <div className="balances-grid">
                    {Object.entries(balances).map(([memberId, balance]) => (
                      <div key={memberId} className={`balance-card ${balance.balance >= 0 ? 'positive' : 'negative'}`}>
                        <div className="balance-info">
                          <h4>{balance.name}</h4>
                          <div className="balance-details">
                            <div className="balance-item">
                              <span className="label">Paid:</span>
                              <span className="amount">{formatCurrency(balance.paid)}</span>
                            </div>
                            <div className="balance-item">
                              <span className="label">Owes:</span>
                              <span className="amount">{formatCurrency(balance.owes)}</span>
                            </div>
                            <div className="balance-item total">
                              <span className="label">Balance:</span>
                              <span className={`amount ${balance.balance >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(balance.balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settlements.length > 0 && (
                <div className="settlements-section">
                  <h3>🔄 Settlement Suggestions</h3>
                  <div className="settlements-list">
                    {settlements.map((settlement, index) => (
                      <div key={index} className="settlement-card">
                        <div className="settlement-info">
                          <span className="from">{settlement.from}</span>
                          <Send className="arrow-icon" />
                          <span className="to">{settlement.to}</span>
                        </div>
                        <span className="settlement-amount">
                          {formatCurrency(settlement.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="expenses-section">
                <h3>📋 Group Expenses ({groupExpenses.length})</h3>
                {groupExpenses.length === 0 ? (
                  <div className="no-expenses">
                    <Receipt className="no-expenses-icon" />
                    <p>No expenses yet</p>
                    <button onClick={() => setShowAddExpenseForm(true)} className="add-first-expense">
                      Add Your First Expense
                    </button>
                  </div>
                ) : (
                  <div className="expenses-list">
                    {groupExpenses.map((expense) => (
                      <div key={expense.id} className="expense-item">
                        <div className="expense-info">
                          <div className="expense-header">
                            <h4>{expense.description}</h4>
                            <span className="expense-amount">{formatCurrency(expense.amount)}</span>
                          </div>
                          <div className="expense-details">
                            <div className="expense-meta">
                              <span className="category">{expense.category}</span>
                              <span className="date">{format(expense.date.toDate(), 'MMM dd, yyyy')}</span>
                              <span className="paid-by">
                                Paid by: {selectedGroup.members.find(m => m.id === expense.paidBy)?.name}
                              </span>
                            </div>
                            <div className="split-details">
                              <span className="split-type">{splitTypes.find(s => s.value === expense.splitType)?.label}</span>
                              <div className="split-amounts">
                                {Object.entries(expense.splits).map(([memberId, amount]) => (
                                  <span key={memberId} className="split-item">
                                    {selectedGroup.members.find(m => m.id === memberId)?.name}: {formatCurrency(amount)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="delete-expense-btn"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-group-selected">
              <Users className="no-group-icon" />
              <h3>Select a group to view expenses</h3>
              <p>Choose a group from the sidebar or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {showAddGroupForm && (
        <div className="form-overlay">
          <div className="group-form">
            <div className="form-header">
              <h3>Create New Group</h3>
              <button className="close-btn" onClick={resetGroupForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleGroupSubmit}>
              <div className="form-content">
                <div className="form-group">
                  <label>Group Name</label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                    required
                    placeholder="e.g., Trip to Goa, Flat Expenses"
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})}
                    placeholder="What is this group for?"
                    rows={3}
                  />
                </div>

                <div className="members-section">
                  <h4>Add Members</h4>
                  
                  <div className="add-member-form">
                    <div className="member-inputs">
                      <input
                        type="text"
                        placeholder="Name"
                        value={memberFormData.name}
                        onChange={(e) => setMemberFormData({...memberFormData, name: e.target.value})}
                      />
                      <input
                        type="email"
                        placeholder="Email (Optional)"
                        value={memberFormData.email}
                        onChange={(e) => setMemberFormData({...memberFormData, email: e.target.value})}
                      />
                      <input
                        type="tel"
                        placeholder="Phone (Optional)"
                        value={memberFormData.phone}
                        onChange={(e) => setMemberFormData({...memberFormData, phone: e.target.value})}
                      />
                    </div>
                    <button type="button" onClick={handleAddMember} className="add-member-btn">
                      <UserPlus />
                    </button>
                  </div>

                  {groupFormData.members.length > 0 && (
                    <div className="added-members">
                      <h5>Members to be added:</h5>
                      <div className="members-list">
                        {groupFormData.members.map((member) => (
                          <div key={member.id} className="member-tag">
                            <span>{member.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="remove-member-btn"
                            >
                              <X />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetGroupForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="create-btn">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpenseForm && selectedGroup && (
        <div className="form-overlay">
          <div className="expense-form">
            <div className="form-header">
              <h3>Add Expense to {selectedGroup.name}</h3>
              <button className="close-btn" onClick={resetExpenseForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="form-content">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={expenseFormData.description}
                      onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
                      required
                      placeholder="e.g., Dinner at restaurant"
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Amount (₹)</label>
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
                    <label>Paid By</label>
                    <select
                      value={expenseFormData.paidBy}
                      onChange={(e) => setExpenseFormData({...expenseFormData, paidBy: e.target.value})}
                      required
                    >
                      <option value="">Select member</option>
                      {selectedGroup.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) => setExpenseFormData({...expenseFormData, category: e.target.value})}
                      required
                    >
                      <option value="">Select category</option>
                      {expenseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
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
                    <label>Split Type</label>
                    <select
                      value={expenseFormData.splitType}
                      onChange={(e) => setExpenseFormData({...expenseFormData, splitType: e.target.value, customSplits: {}})}
                    >
                      {splitTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {expenseFormData.splitType !== 'equal' && expenseFormData.amount && (
                  <div className="split-section">
                    <h4>
                      {expenseFormData.splitType === 'exact' && 'Enter exact amounts'}
                      {expenseFormData.splitType === 'percentage' && 'Enter percentages'}
                      {expenseFormData.splitType === 'shares' && 'Enter shares'}
                    </h4>
                    
                    <div className="split-inputs">
                      {selectedGroup.members.map((member) => (
                        <div key={member.id} className="split-input-group">
                          <label>{member.name}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={
                              expenseFormData.splitType === 'exact' ? '0.00' :
                              expenseFormData.splitType === 'percentage' ? '0%' :
                              '1'
                            }
                            value={expenseFormData.customSplits[member.id] || ''}
                            onChange={(e) => updateSplitAmount(member.id, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="split-validation">
                      {expenseFormData.splitType === 'exact' && (
                        <p className={getTotalCustomSplits() === parseFloat(expenseFormData.amount) ? 'valid' : 'invalid'}>
                          Total: {formatCurrency(getTotalCustomSplits())} / {formatCurrency(parseFloat(expenseFormData.amount) || 0)}
                        </p>
                      )}
                      {expenseFormData.splitType === 'percentage' && (
                        <p className={getTotalCustomSplits() === 100 ? 'valid' : 'invalid'}>
                          Total: {getTotalCustomSplits()}% / 100%
                        </p>
                      )}
                    </div>
                  </div>
                )}
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

export default ExpenseSplitting;
