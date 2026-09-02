#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0bc34a65e16efdd105f625ac7dc6090bf1db62500e22af79cf612ea6f54ea6f2/contract';
import endContract from '../../snapshots/0bc34a65e16efdd105f625ac7dc6090bf1db62500e22af79cf612ea6f54ea6f2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/179cc83c4745aedc12b42d5c50c9ea71e9bd17708cd23c1ac5ad20ea5d77b4e0/contract';
import startContract from '../../snapshots/179cc83c4745aedc12b42d5c50c9ea71e9bd17708cd23c1ac5ad20ea5d77b4e0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'pendingSignup',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('otpAttempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('otpExpiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('otpHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'pendingSignup',
        constraint: 'pendingSignup_email_key',
        columns: ['email'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
