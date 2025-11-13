// Parse instruction string without regex
module.exports = function parseInstruction(text) {
  if (!text || typeof text !== 'string') return { error: true };

  const parts = text.trim().split(/\s+/);
  const upperParts = parts.map((p) => p.toUpperCase());
  const type = upperParts[0];

  if (!['DEBIT', 'CREDIT'].includes(type)) return { error: true };

  // Very simple baseline parse; expand as needed
  const amount = Number(parts[1]);
  const currency = upperParts[2];
  const fromIndex = upperParts.indexOf('FROM');
  const toIndex = upperParts.indexOf('TO');
  const onIndex = upperParts.indexOf('ON');

  if (fromIndex === -1 || toIndex === -1) return { error: true };

  const debitAccount = parts[fromIndex + 2];
  const creditAccount = parts[toIndex + 2];
  const executeBy = onIndex !== -1 ? parts[onIndex + 1] : null;

  return {
    type,
    amount,
    currency,
    debit_account: debitAccount,
    credit_account: creditAccount,
    execute_by: executeBy,
  };
};
