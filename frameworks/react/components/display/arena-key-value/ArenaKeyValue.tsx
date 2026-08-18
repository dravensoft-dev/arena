import React from 'react';
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaKeyValue.classes.generated.ts';

import type { ArenaKeyValueRow } from '../../../Api.generated';

export interface ArenaKeyValueProps {

  /** The rows, in the order they are given. An empty array renders an empty list rather than throwing, because a summary with nothing to adjust is a state a basket reaches on its way to being filled and not a mistake in the markup. */
  rows: readonly ArenaKeyValueRow[];

  /** The row the others add up to, drawn last, ruled off above and set in the heading register. It is a member rather than the last element of rows because the rule and the register are what say a total is a total, and deriving that from position would make the last adjustment in a list look like one. */
  total?: ArenaKeyValueRow;
}

const arenaKeyValueStyles = arenaStyles(manifest);

export function ArenaKeyValue({ rows, total }: ArenaKeyValueProps) {
  const styles = arenaKeyValueStyles();

  return (
    <dl className={styles.root()} data-arena-part={manifest.parts.root}>
      {rows.map((row, index) => (
        <div key={`${row.term}-${index}`} className={styles.row()} data-arena-part={manifest.parts.row}>
          <dt className={styles.term()} data-arena-part={manifest.parts.term}>{row.term}</dt>
          <dd className={row.numeric ? styles.valueNumeric() : styles.value()}
              data-arena-part={manifest.parts.value}>{row.value}</dd>
        </div>
      ))}
      {total && (
        <div className={styles.total()} data-arena-part={manifest.parts.total}>
          <dt className={styles.totalTerm()} data-arena-part={manifest.parts.totalTerm}>{total.term}</dt>
          <dd className={total.numeric ? styles.totalValueNumeric() : styles.totalValue()}
            data-arena-part={manifest.parts.totalValue}>{total.value}</dd>
        </div>
      )}
    </dl>
  );
}
