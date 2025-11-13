/**
 * Determine if transaction should be pending based on execution date
 */
function shouldBePending(executeBy) {
  if (!executeBy) {
    return false;
  }

  // Get current UTC date (date only, no time)
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayStr = todayUTC.toISOString().slice(0, 10);

  // Compare dates only
  return executeBy > todayStr;
}

/**
 * Build a single account object for response
 */
function buildAccountObject(account, balance, balanceBefore) {
  return {
    id: account.id,
    balance,
    balance_before: balanceBefore,
    currency: account.currency,
  };
}

/**
 * Build accounts response array maintaining original order from request
 */
function buildAccountsResponse(
  accounts,
  debitAccountId,
  creditAccountId,
  debitAccount,
  creditAccount,
  isPending,
  amount
) {
  // Map original accounts with their indices
  const originalIndices = accounts.map((acc, idx) => ({ acc, idx }));

  // Filter to only involved accounts
  const involvedAccounts = originalIndices.filter(
    (item) => item.acc.id === debitAccountId || item.acc.id === creditAccountId
  );

  // Sort by original index to maintain order
  involvedAccounts.sort((a, b) => a.idx - b.idx);

  // Build response objects
  return involvedAccounts.map((item) => {
    if (item.acc.id === debitAccountId) {
      return buildAccountObject(
        debitAccount,
        isPending ? debitAccount.balance : debitAccount.balance - amount,
        debitAccount.balance
      );
    }
    return buildAccountObject(
      creditAccount,
      isPending ? creditAccount.balance : creditAccount.balance + amount,
      creditAccount.balance
    );
  });
}

/**
 * Build pending transaction response
 */
function buildPendingResponse(parsed, accountsResponse) {
  return {
    ...parsed,
    status: 'pending',
    status_code: 'AP02',
    status_reason: 'Transaction scheduled for future execution',
    accounts: accountsResponse,
  };
}

/**
 * Build successful transaction response
 */
function buildSuccessResponse(parsed, accountsResponse) {
  return {
    ...parsed,
    status: 'successful',
    status_code: 'AP00',
    status_reason: 'Transaction executed successfully',
    accounts: accountsResponse,
  };
}

/**
 * Main executor function
 */
module.exports = function executor(parsed, accounts) {
  const {
    amount,
    debit_account: debitAccountId,
    credit_account: creditAccountId,
    execute_by: executeBy,
  } = parsed;

  // Find accounts
  const debitAccount = accounts.find((a) => a.id === debitAccountId);
  const creditAccount = accounts.find((a) => a.id === creditAccountId);

  // Determine if transaction should be pending
  const isPending = shouldBePending(executeBy);

  // Get involved accounts in original order
  const accountsResponse = buildAccountsResponse(
    accounts,
    debitAccountId,
    creditAccountId,
    debitAccount,
    creditAccount,
    isPending,
    amount
  );

  if (isPending) {
    return buildPendingResponse(parsed, accountsResponse);
  }

  return buildSuccessResponse(parsed, accountsResponse);
};
