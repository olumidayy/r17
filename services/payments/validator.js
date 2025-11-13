module.exports = function validate(parsed, accounts) {
  const { amount, currency, debit_account: debitAccount, credit_account: creditAccount } = parsed;

  const debit = accounts.find((a) => a.id === debitAccount);
  const credit = accounts.find((a) => a.id === creditAccount);

  if (!debit || !credit) return { valid: false, code: 'AC03' };
  if (debit.id === credit.id) return { valid: false, code: 'AC02' };
  if (debit.currency !== credit.currency) return { valid: false, code: 'CU01' };
  if (!['NGN', 'USD', 'GBP', 'GHS'].includes(currency)) return { valid: false, code: 'CU02' };
  if (Number.isNaN(amount) || amount <= 0 || !Number.isInteger(amount))
    return { valid: false, code: 'AM01' };
  if (debit.balance < amount) return { valid: false, code: 'AC01' };

  return { valid: true };
};
