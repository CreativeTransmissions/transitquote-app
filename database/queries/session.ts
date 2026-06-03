/** Wipe all local data on logout (spec: logout clears token + local DB). Synchronous (expo-sqlite). */
import { db } from '../client';
import {
  jobs,
  jobDetails,
  drivers,
  customers,
  services,
  vehicles,
  statusTypes,
  paymentStatusTypes,
  teamSettings,
  currentUser,
  outbox,
  syncMeta,
} from '../schema';

export function clearLocalData(): void {
  db.transaction((tx) => {
    tx.delete(jobDetails).run(); // child first (FK → jobs)
    tx.delete(jobs).run();
    tx.delete(drivers).run();
    tx.delete(customers).run(); // customer PII must not survive logout / leak across a site switch
    tx.delete(services).run();
    tx.delete(vehicles).run();
    tx.delete(statusTypes).run();
    tx.delete(paymentStatusTypes).run();
    tx.delete(teamSettings).run();
    tx.delete(currentUser).run();
    tx.delete(outbox).run();
    tx.delete(syncMeta).run();
  });
}
