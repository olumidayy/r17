module.exports = function executor(parsed, accounts) {
  const {
    amount,
    debit_account: debitAccount,
    credit_account: creditAccount,
    execute_by: executeBy,
  } = parsed;
  const debit = accounts.find((a) => a.id === debitAccount);
  const credit = accounts.find((a) => a.id === creditAccount);

  const today = new Date().toISOString().slice(0, 10);
  const pending = executeBy && executeBy > today;

  if (pending) {
    return {
      ...parsed,
      status: 'pending',
      status_code: 'AP02',
      accounts: [debit, credit],
    };
  }

  // Execute immediately
  const debitBefore = debit.balance;
  const creditBefore = credit.balance;
  debit.balance -= amount;
  credit.balance += amount;

  return {
    ...parsed,
    status: 'successful',
    status_code: 'AP00',
    accounts: [
      { ...debit, balance_before: debitBefore },
      { ...credit, balance_before: creditBefore },
    ],
  };
};
