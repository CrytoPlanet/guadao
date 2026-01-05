const makeStatus = (kind, messageKey, values) => ({
  kind,
  messageKey,
  values,
});

const statusReady = () => makeStatus('neutral', 'status.ready');
const statusLoading = () => makeStatus('loading', 'status.loading');
const statusLoaded = () => makeStatus('success', 'status.loaded');
const statusEmpty = () => makeStatus('empty', 'status.empty');
const statusError = (messageKey, values) =>
  makeStatus('error', messageKey || 'status.error', values);

const statusTxSubmitted = () => makeStatus('loading', 'status.tx.submitted');
const statusTxConfirming = () => makeStatus('loading', 'status.tx.confirming');
const statusTxConfirmed = () => makeStatus('success', 'status.tx.confirmed');

const statusNetworkMismatch = () => statusError('status.networkMismatch');
const statusNoRpc = () => statusError('status.noRpc');
const statusInvalidAddress = () => statusError('status.invalidAddress');
const statusInvalidProposal = () => statusError('status.invalidProposal');

export {
  makeStatus,
  statusReady,
  statusLoading,
  statusLoaded,
  statusEmpty,
  statusError,
  statusTxSubmitted,
  statusTxConfirming,
  statusTxConfirmed,
  statusNetworkMismatch,
  statusNoRpc,
  statusInvalidAddress,
  statusInvalidProposal,
};
