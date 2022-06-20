# 2. auto remove process id menu item when it does not meet the threshold

Date: 2022-06-20

## Status

2022-06-20 proposed

## Context

As what the title said, it should notify the process to update the ui when process status changed

## Decision

The `monitor.alertCallback` to `monitor.changedCallback` and add property `type`, and it has two `type`: `add` and `remove`

## Consequences

Consequences here...
