/**
 * Normalize whitespace - replace multiple spaces with single space
 */
function normalizeWhitespace(text) {
  let normalized = text.trim();
  while (normalized.includes('  ')) {
    normalized = normalized.replace('  ', ' ');
  }
  return normalized;
}

/**
 * Parse and validate amount
 */
function parseAmount(amountStr) {
  if (!amountStr) {
    return { error: true, code: 'SY03' };
  }

  const amount = Number(amountStr);
  if (
    Number.isNaN(amount) ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return { error: true, code: 'AM01' };
  }

  return { amount };
}

/**
 * Find positions of all keywords in the instruction
 */
function findKeywordPositions(upperParts) {
  const accountIndices = [];
  for (let i = 0; i < upperParts.length; i++) {
    if (upperParts[i] === 'ACCOUNT') {
      accountIndices.push(i);
    }
  }

  return {
    fromIndex: upperParts.indexOf('FROM'),
    toIndex: upperParts.indexOf('TO'),
    forIndex: upperParts.indexOf('FOR'),
    creditIndex: upperParts.indexOf('CREDIT'),
    debitIndex: upperParts.lastIndexOf('DEBIT'),
    onIndex: upperParts.indexOf('ON'),
    accountIndices,
  };
}

/**
 * Parse DEBIT format instruction
 * Expected: DEBIT amount currency FROM ACCOUNT debitAcc FOR CREDIT TO ACCOUNT creditAcc [ON date]
 */
function parseDebitFormat(parts, keywords) {
  const { fromIndex, toIndex, forIndex, creditIndex, accountIndices } = keywords;

  // Validate keyword presence
  if (
    fromIndex === -1 ||
    accountIndices.length < 2 ||
    forIndex === -1 ||
    creditIndex === -1 ||
    toIndex === -1
  ) {
    return { error: true, code: 'SY01' };
  }

  // Validate keyword order
  const firstAccountIndex = accountIndices[0];
  const secondAccountIndex = accountIndices[1];

  if (
    !(
      fromIndex > 0 &&
      fromIndex < firstAccountIndex &&
      firstAccountIndex < forIndex &&
      forIndex < creditIndex &&
      creditIndex < toIndex &&
      toIndex < secondAccountIndex
    )
  ) {
    return { error: true, code: 'SY02' };
  }

  // Extract account IDs
  const debitAccount = parts[firstAccountIndex + 1];
  const creditAccount = parts[secondAccountIndex + 1];

  if (!debitAccount || !creditAccount) {
    return { error: true, code: 'SY03' };
  }

  return { debitAccount, creditAccount };
}

/**
 * Parse CREDIT format instruction
 * Expected: CREDIT amount currency TO ACCOUNT creditAcc FOR DEBIT FROM ACCOUNT debitAcc [ON date]
 */
function parseCreditFormat(parts, keywords) {
  const { toIndex, fromIndex, forIndex, debitIndex, accountIndices } = keywords;

  // Validate keyword presence
  if (
    toIndex === -1 ||
    accountIndices.length < 2 ||
    forIndex === -1 ||
    debitIndex === -1 ||
    fromIndex === -1
  ) {
    return { error: true, code: 'SY01' };
  }

  // Validate keyword order
  const firstAccountIndex = accountIndices[0];
  const secondAccountIndex = accountIndices[1];

  if (
    !(
      toIndex > 0 &&
      toIndex < firstAccountIndex &&
      firstAccountIndex < forIndex &&
      forIndex < debitIndex &&
      debitIndex < fromIndex &&
      fromIndex < secondAccountIndex
    )
  ) {
    return { error: true, code: 'SY02' };
  }

  // Extract account IDs
  const creditAccount = parts[firstAccountIndex + 1];
  const debitAccount = parts[secondAccountIndex + 1];

  if (!debitAccount || !creditAccount) {
    return { error: true, code: 'SY03' };
  }

  return { debitAccount, creditAccount };
}

/**
 * Validate account ID format: letters, numbers, hyphens, periods, at symbols only
 */
function isValidAccountId(id) {
  if (!id || typeof id !== 'string') return false;

  for (let i = 0; i < id.length; i++) {
    const char = id[i];
    const isLetter = (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    const isNumber = char >= '0' && char <= '9';
    const isSpecial = char === '-' || char === '.' || char === '@';

    if (!isLetter && !isNumber && !isSpecial) {
      return false;
    }
  }

  return true;
}

/**
 * Validate both account IDs
 */
function validateAccountIds(debitAccount, creditAccount) {
  if (!isValidAccountId(debitAccount) || !isValidAccountId(creditAccount)) {
    return { error: true, code: 'AC04' };
  }
  return {};
}

/**
 * Check if string contains only numeric characters
 */
function isNumericString(str) {
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char < '0' || char > '9') return false;
  }
  return true;
}

/**
 * Validate date format YYYY-MM-DD without regex
 */
function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (dateStr.length !== 10) return false;

  // Check format: YYYY-MM-DD
  if (dateStr[4] !== '-' || dateStr[7] !== '-') return false;

  const yearStr = dateStr.substring(0, 4);
  const monthStr = dateStr.substring(5, 7);
  const dayStr = dateStr.substring(8, 10);

  // Check if all parts are numbers
  if (!isNumericString(yearStr) || !isNumericString(monthStr) || !isNumericString(dayStr)) {
    return false;
  }

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Basic date validation
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Additional validation: check if date is valid
  const date = new Date(`${yearStr}-${monthStr}-${dayStr}`);
  if (Number.isNaN(date.getTime())) return false;

  return true;
}

/**
 * Parse optional execution date
 */
function parseExecutionDate(parts, onIndex) {
  if (onIndex === -1) {
    return { executeBy: null };
  }

  const dateStr = parts[onIndex + 1];
  if (!dateStr) {
    return { error: true, code: 'DT01' };
  }

  if (!isValidDateFormat(dateStr)) {
    return { error: true, code: 'DT01' };
  }

  return { executeBy: dateStr };
}

/**
 * Main parser function
 */
module.exports = function parseInstruction(text) {
  if (!text || typeof text !== 'string') {
    return { error: true, code: 'SY03' };
  }

  // Normalize whitespace
  const normalized = normalizeWhitespace(text);
  const parts = normalized.split(' ');
  const upperParts = parts.map((p) => p.toUpperCase());

  // Validate and get instruction type
  const type = upperParts[0];
  if (!['DEBIT', 'CREDIT'].includes(type)) {
    return { error: true, code: 'SY01' };
  }

  try {
    // Parse and validate amount
    const amountResult = parseAmount(parts[1]);
    if (amountResult.error) {
      return amountResult;
    }

    // Parse currency
    const currency = upperParts[2];
    if (!currency) {
      return { error: true, code: 'SY03' };
    }

    // Find all keyword positions
    const keywords = findKeywordPositions(upperParts);

    // Parse accounts based on instruction type
    const accountsResult =
      type === 'DEBIT' ? parseDebitFormat(parts, keywords) : parseCreditFormat(parts, keywords);

    if (accountsResult.error) {
      return accountsResult;
    }

    // Validate account ID formats
    const accountValidation = validateAccountIds(
      accountsResult.debitAccount,
      accountsResult.creditAccount
    );
    if (accountValidation.error) {
      return accountValidation;
    }

    // Parse optional date
    const dateResult = parseExecutionDate(parts, keywords.onIndex);
    if (dateResult.error) {
      return dateResult;
    }

    return {
      type,
      amount: amountResult.amount,
      currency,
      debit_account: accountsResult.debitAccount,
      credit_account: accountsResult.creditAccount,
      execute_by: dateResult.executeBy,
    };
  } catch (err) {
    return { error: true, code: 'SY03' };
  }
};
