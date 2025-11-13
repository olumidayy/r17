const { createHandler } = require('@app-core/server');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const paymentInstructionsService = require('../../services/payments');

module.exports = createHandler({
  path: '/payment-instructions',
  method: 'post',
  middlewares: [],

  async onResponseEnd(rc, rs) {
    appLogger.info({ requestContext: rc, response: rs }, 'payment-instruction-request-completed');
  },

  async handler(rc, helpers) {
    const payload = rc.body;

    const response = await paymentInstructionsService(payload);
    if (response.status === 'failed') {
      return throwAppError(response.status_reason, response.status_code, { context: response });
    }
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: response,
    };
  },
});
