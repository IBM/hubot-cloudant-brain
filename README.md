# hubot-cloudant-brain

Cloudant brain for Hubot. Inspired by [hubot-mongodb-brain](https://github.com/shokai/hubot-mongodb-brain).

## Design

- Each record (as an unqiue key of `robot.brain.set()`) is saved as a document in cloudant.
- Currently does NOT handle revision conflicts, i.e. if you changed data in cloudant, you'll see revision conflict errors when hubot tries to save its brain.


