const parser = require('./parser');
const validator = require('./validator');
const executor = require('./executor');
const messages = require('../../messages/payments');

module.exports = async function paymentsService(serviceData) {
  const { instruction, accounts } = serviceData;

  // Step 1: Parse instruction
  const parsed = parser(instruction);

  if (parsed.error) {
    return {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: messages[parsed.code] || messages.SY03,
      status_code: parsed.code || 'SY03',
      accounts: [],
    };
  }

  // Step 2: Validate business rules
  const validation = validator(parsed, accounts);

  if (!validation.valid) {
    // For failed validations, return the parsed data but with original account balances
    const debitAccount = accounts.find((a) => a.id === parsed.debit_account);
    const creditAccount = accounts.find((a) => a.id === parsed.credit_account);

    // Get involved accounts in original order
    const involvedAccounts = [];
    if (debitAccount && creditAccount) {
      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        if (acc.id === parsed.debit_account || acc.id === parsed.credit_account) {
          involvedAccounts.push({
            id: acc.id,
            balance: acc.balance,
            balance_before: acc.balance,
            currency: acc.currency,
          });
        }
      }
    }

    return {
      type: parsed.type,
      amount: parsed.amount,
      currency: parsed.currency,
      debit_account: parsed.debit_account,
      credit_account: parsed.credit_account,
      execute_by: parsed.execute_by,
      status: 'failed',
      status_reason: validation.reason || messages[validation.code],
      status_code: validation.code,
      accounts: involvedAccounts,
    };
  }

  // Step 3: Execute transaction
  const result = executor(parsed, accounts);

  return result;
};
