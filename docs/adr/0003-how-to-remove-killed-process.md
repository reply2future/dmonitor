# 3. how to remove killed process

Date: 2022-06-24

## Status

2022-06-24 proposed

## Context

[0002-auto-remove-process](./0002-auto-remove-process-id-menu-item-when-it-does-not-meet-the-threshold.md)

The process cannot be removed when the status changes from draining to killed.

## Decision

Adding a timer to the `monitor` class for checking the time interval and when the cached draining process is long time not updated during slibing window size, 
it would send a `remove` signal to the main process.

## Consequences

Consequences here...
