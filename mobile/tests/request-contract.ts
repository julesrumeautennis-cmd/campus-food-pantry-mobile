// This module is both typechecked with the app and executed by Node's test runner.
import example from '../../backend/src/test/resources/contracts/request.json' with { type: 'json' };
import type { PantryRequest, SubmitRequest } from '../src/types';

export const submit = example.submit satisfies SubmitRequest;

// JSON imports widen string literals to string. Narrow the actual wire value
// before checking the entire response against the type used by RequestCard.
const { status } = example.pending;
if (status !== 'PENDING') throw new Error('The submitted request must be PENDING.');
export const pending = { ...example.pending, status } satisfies PantryRequest;
