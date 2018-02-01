# hubot-ibmcloudant-brain

Cloudant brain for Hubot. Inspired by [hubot-mongodb-brain](https://github.com/shokai/hubot-mongodb-brain).

## Installation

1. Install this script:

```shell
npm install hubot-ibmcloudant-brain --save
```

2. Add this script to `external-scripts.json`:

```json
[
  "hubot-ibmcloudant-brain"
]
```

## Configuration

Set your cloudant URL in env var `CLOUDANT_URL`.


## Design

- Each record (as an unqiue key of `robot.brain.set()`) is saved as a document in cloudant.
- Records with `null` or `undefined` value are deleted from cloudant.
- Currently does NOT handle revision conflicts, i.e. if you changed data in cloudant, you'll see revision conflict errors when hubot tries to save its brain.


