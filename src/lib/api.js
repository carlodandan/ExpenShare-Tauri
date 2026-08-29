import { invoke } from '@tauri-apps/api/core';

export const tauriAPI = {
  income: {
    listForMonth: (month) => invoke('income_list_for_month', { month }),
    create: (payload) => invoke('income_create', { payload }),
    update: (id, payload) => invoke('income_update', { id, payload }),
    delete: (id) => invoke('income_delete', { id }),
  },
  expenses: {
    listCategories: () => invoke('expenses_list_categories'),
    listForMonth: (month) => invoke('expenses_list_for_month', { month }),
    create: (payload) => invoke('expenses_create', { payload }),
    setFixedForMonth: (payload) => invoke('expenses_set_fixed_for_month', { payload }),
    update: (id, payload) => invoke('expenses_update', { id, payload }),
    delete: (id) => invoke('expenses_delete', { id }),
  },
  dashboard: {
    getMonthly: (month) => invoke('dashboard_get_monthly', { month }),
    getTotal: () => invoke('dashboard_get_total'),
  },
  extraBudget: {
    getHistory: () => invoke('extra_budget_get_history'),
    listWithdrawals: () => invoke('extra_budget_list_withdrawals'),
    withdraw: (payload) => invoke('extra_budget_withdraw', { payload }),
    deleteWithdrawal: (id) => invoke('extra_budget_delete_withdrawal', { id }),
    withdrawAndExpense: (payload) => invoke('extra_budget_withdraw_and_expense', { payload }),
  },
  goals: {
    list: () => invoke('goals_list'),
    create: (payload) => invoke('goals_create', { payload }),
    update: (id, payload) => invoke('goals_update', { id, payload }),
    delete: (id) => invoke('goals_delete', { id }),
    addFunds: (payload) => invoke('goals_add_funds', { payload }),
    listContributions: (goalId) => invoke('goals_list_contributions', { goalId }),
    deleteContribution: (id) => invoke('goals_delete_contribution', { id }),
  },
  settings: {
    getAll: () => invoke('settings_get_all'),
    set: (key, value) => invoke('settings_set', { key, value: String(value) }),
    renamePerson: (id, name) => invoke('settings_rename_person', { id, name }),
    getVersion: () => invoke('settings_get_version'),
  },
  reports: {
    export: (month, format) => invoke('reports_export', { month, format }),
  },
  backup: {
    export: () => invoke('backup_export'),
    restore: () => invoke('backup_restore'),
  },
  appInfo: {
    getVersion: () => invoke('get_app_info'),
  },
  updater: {
    check: () => invoke('check_for_updates_now'),
  },
};

export function installApi() {
  if (typeof window === 'undefined') return;
  window.tauriAPI = tauriAPI;
}
