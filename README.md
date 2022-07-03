# dmonitor

[![coverfdd1c0032d416d64.png](https://s8.gifyu.com/images/coverfdd1c0032d416d64.png)](https://gifyu.com/image/SHD1K)

[![codecov](https://codecov.io/gh/reply2future/dmonitor/branch/main/graph/badge.svg?token=FQ2AUS3XTE)](https://codecov.io/gh/reply2future/dmonitor)
[![Maintainability](https://api.codeclimate.com/v1/badges/34141bb8d8e9ef13fdc6/maintainability)](https://codeclimate.com/github/reply2future/dmonitor/maintainability)
[![JavaScript Style Guide: Standard](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)
[![Electron Version](https://img.shields.io/badge/electron-19.0-brightgreen.svg?style=flat)](https://www.electronjs.org/)

It will notify you before the battery is draining too fast like a prophet.

## How

The monitor will collect the cpu usage information, if the median of cpu usage is bigger than threshold during the sliding window time, it will send a notification to you about the process id and command name, so you can kill the process.

## Use Case

1. [macos mail app high cpu usage](https://discussions.apple.com/thread/252128950)
2. forget to close the benchmark process

## Features

1. notify when the process is draining too fast
2. silent time for compiling
3. kill the process manually

## Usage

1. downloaded the latest version from [release page](https://github.com/reply2future/dmonitor/releases)
2. unzip the package
3. click `dmonitor-x.x.x.dmg` to install.
4. open the app and set for [unidentified developer](https://www.macworld.com/article/672947/how-to-open-a-mac-app-from-an-unidentified-developer.html#how-to-open-apps-not-from-mac-app-store)
5. turn on the monitor in the menu bar

## Compatibility

| Linux | macOS | Win |
| --- | --- | --- |
| ❓ |  ✅ | ℹ️ |

✅ = Working  
ℹ️ = Not Accurate  
❓ = Should Work  
❌ = Not Working  

## Development

1. [electron.js](https://www.electronjs.org/)
2. node.js >= 16

## Contribute

1. open a issue if it does not exist
2. fork the repo
3. create the branch like `feature/issue#1_xxxx` or `bugfix/issue#1_xxx`
4. pull request if you finished it.
