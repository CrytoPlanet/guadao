# Best Issue Order (from issues/)

## Recommended next proposal
Implement the full TopicBountyEscrow flow (BC1–BC9) as one cohesive proposal. These issues define the core voting + escrow lifecycle and are tightly coupled across shared state and transitions.

## Execution order
1. BC1: create proposal + data model
2. BC2: stakeVote (lock GUA)
3. BC3: finalizeVoting (pick winner)
4. BC4: confirmWinnerAndPay10 (accept + 10% payout)
5. BC5: submitDelivery (start challenge window)
6. BC7: challengeDelivery (bond + dispute)
7. BC8: resolveDispute (admin arbitration)
8. BC6: finalizeDelivery (auto-pay 90%)
9. BC9: expireIfNoSubmission (timeout path)

## Notes
- A1/A2/A3 are already completed, so the next meaningful proposal is BC1–BC9.
- BC7/BC8 should be implemented before BC6 so dispute handling is defined before the finalization path.
