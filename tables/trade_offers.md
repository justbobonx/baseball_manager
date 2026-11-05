# Trade_offers collection — deferred

Trades are deferred. The app neither reads nor writes this collection.
Keep the collection as is (or lock all its API rules) until trades are designed;
it should then reference team_players positions instead of the old roles.

## Fields (unchanged)

| Field             | Type     | Notes                      |
|-------------------|----------|----------------------------|
| from_team         | relation | → teams                    |
| to_team           | relation | → teams                    |
| offered_player    | relation | → players                  |
| requested_player  | relation | → players                  |
| status            | select   | pending / accepted / rejected |
