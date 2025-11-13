const parser = require('./parser');
const validator = require('./validator');
const executor = require('./executor');
const messages = require('../../messages/payments');

module.exports = async function paymentInstructionsService(serviceData) {
  const { instruction, accounts } = serviceData;

  const parsed = parser(instruction);
  if (!parsed || parsed.error) {
    return {
      type: null,
      amount: null,
      currency: null,
      debit_account: null,
      credit_account: null,
      execute_by: null,
      status: 'failed',
      status_reason: messages.SY03,
      status_code: 'SY03',
      accounts: [],
    };
  }

  const validation = validator(parsed, accounts);
  if (!validation.valid) {
    return {
      ...parsed,
      status: 'failed',
      status_reason: messages[validation.code],
      status_code: validation.code,
      accounts: [],
    };
  }

  const result = executor(parsed, accounts);

  return {
    ...result,
    status_reason: messages[result.status_code],
  };
};
