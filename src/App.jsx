import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/Dashboard';
import ExpenseManager from './components/ExpenseManager';
import FestivalMode from './components/FestivalMode';
import FamilyExpenses from './components/FamilyExpenses';
import SavingsTracker from './components/SavingsTracker';
import Reports from './components/Reports';
import ExpenseSplitting from './components/ExpenseSplitting';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="expenses" element={<ExpenseManager />} />
              <Route path="festival" element={<FestivalMode />} />
              <Route path="family" element={<FamilyExpenses />} />
              <Route path="savings" element={<SavingsTracker />} />
              <Route path="reports" element={<Reports />} />
              <Route path="splitting" element={<ExpenseSplitting />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </div>
  );
}

export default App;
