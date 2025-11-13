/**
 * Validate amount is a positive integer
 */
function validateAmount(amount) {
  if (
    Number.isNaN(amount) ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return {
      valid: false,
      code: 'AM01',
      reason: 'Amount must be a positive integer',
    };
  }
  return { valid: true };
}

/**
 * Validate both accounts exist in the accounts array
 */
function validateAccountsExist(debit, credit, debitAccountId, creditAccountId) {
  if (!debit) {
    return {
      valid: false,
      code: 'AC03',
      reason: `Account not found: ${debitAccountId}`,
    };
  }

  if (!credit) {
    return {
      valid: false,
      code: 'AC03',
      reason: `Account not found: ${creditAccountId}`,
    };
  }

  return { valid: true };
}

/**
 * Validate debit and credit accounts are different
 */
function validateAccountsAreDifferent(debit, credit) {
  if (debit.id === credit.id) {
    return {
      valid: false,
      code: 'AC02',
      reason: 'Debit and credit accounts cannot be the same',
    };
  }
  return { valid: true };
}

/**
 * Validate currency is one of the supported currencies
 */
function validateCurrencySupported(currency) {
  const supportedCurrencies = ['NGN', 'USD', 'GBP', 'GHS'];

  if (!supportedCurrencies.includes(currency)) {
    return {
      valid: false,
      code: 'CU02',
      reason: `Unsupported currency. Only ${supportedCurrencies.join(', ')} are supported`,
    };
  }

  return { valid: true };
}

/**
 * Validate currency matches between accounts and instruction
 */
function validateCurrencyMatch(debit, credit, currency) {
  // Check if both accounts have the same currency
  if (debit.currency !== credit.currency) {
    return {
      valid: false,
      code: 'CU01',
      reason: `Account currency mismatch: ${debit.id} has ${debit.currency}, ${credit.id} has ${credit.currency}`,
    };
  }

  // Check if instruction currency matches account currencies
  if (debit.currency !== currency || credit.currency !== currency) {
    return {
      valid: false,
      code: 'CU01',
      reason: `Instruction currency ${currency} does not match account currency ${debit.currency}`,
    };
  }

  return { valid: true };
}

/**
 * Validate debit account has sufficient funds
 */
function validateSufficientFunds(debit, amount, currency) {
  if (debit.balance < amount) {
    return {
      valid: false,
      code: 'AC01',
      reason: `Insufficient funds in account ${debit.id}: has ${debit.balance} ${debit.currency}, needs ${amount} ${currency}`,
    };
  }

  return { valid: true };
}

/**
 * Main validation function
 */
module.exports = function validate(parsed, accounts) {
  const {
    amount,
    currency,
    debit_account: debitAccountId,
    credit_account: creditAccountId,
  } = parsed;

  // Validate amount (redundant check, but good to have)
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }

  // Find accounts
  const debit = accounts.find((a) => a.id === debitAccountId);
  const credit = accounts.find((a) => a.id === creditAccountId);

  // Validate accounts exist
  const accountExistence = validateAccountsExist(debit, credit, debitAccountId, creditAccountId);
  if (!accountExistence.valid) {
    return accountExistence;
  }

  // Validate accounts are different
  const accountUniqueness = validateAccountsAreDifferent(debit, credit);
  if (!accountUniqueness.valid) {
    return accountUniqueness;
  }

  // Validate currency is supported
  const currencySupport = validateCurrencySupported(currency);
  if (!currencySupport.valid) {
    return currencySupport;
  }

  // Validate currency match between accounts
  const currencyMatch = validateCurrencyMatch(debit, credit, currency);
  if (!currencyMatch.valid) {
    return currencyMatch;
  }

  // Validate sufficient funds
  const fundsValidation = validateSufficientFunds(debit, amount, currency);
  if (!fundsValidation.valid) {
    return fundsValidation;
  }

  return { valid: true };
};
