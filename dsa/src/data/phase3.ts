import type { Algorithm } from './types'

export const phase3: Algorithm[] = [
  {
    id: 'graph-traversal',
    name: 'Graph BFS / DFS',
    phase: 3,
    tagline: 'Trees with cycles: add a visited set and explore from every unvisited node.',
    idea:
      'A graph is nodes plus edges, possibly with cycles and no single root. Explore with DFS (recursion or a stack) to cover everything connected, or BFS (a queue) to find shortest paths when every edge costs the same. Mark nodes visited so you never process one twice.',
    why:
      'Each node and edge is processed once, so traversal is O(V + E). BFS explores in order of distance from the start, so the first time it reaches a node is along a shortest path. Starting a traversal from each unvisited node counts connected components.',
    cues: [
      'A grid of cells: islands, regions, flood fill, rotting / spreading',
      '"Connected", "reachable", "number of components"',
      '"Minimum steps / moves / transformations" with equal costs → BFS',
      'Explicit edges, neighbour lists, or an implicit graph (words one letter apart)',
    ],
    pitfalls: [
      'Marking visited when popping instead of when pushing in BFS (nodes get queued many times)',
      'Forgetting grid bounds checks',
      'Multi-source problems (rotting oranges): put every source in the queue at the start',
    ],
    complexity: 'O(V + E) time (O(rows × cols) on a grid), O(V) space',
    template: `from collections import deque
def bfs(start):
    q = deque([start])
    seen = {start}
    steps = 0
    while q:
        for _ in range(len(q)):
            node = q.popleft()
            if node == goal:
                return steps
            for nxt in neighbours(node):
                if nxt not in seen:
                    seen.add(nxt)       # mark on push
                    q.append(nxt)
        steps += 1
    return -1`,
    prereqs: ['tree-bfs', 'tree-dfs'],
    groups: [
      {
        structure: 'Grid',
        note: 'Each cell is a node; its up/down/left/right cells are its edges.',
        questions: [
          { title: 'Flood Fill', slug: 'flood-fill', level: 'Easy', hints: [
            'DFS from the start cell, recolouring cells that have the original colour.',
            'If the new colour equals the original, return immediately (otherwise you loop forever).',
          ] },
          { title: 'Number of Islands', slug: 'number-of-islands', level: 'Medium', hints: [
            'Each island is one connected component of "1" cells.',
            'Scan the grid; each unvisited "1" starts a DFS that sinks the whole island. Count the starts.',
          ] },
          { title: 'Max Area of Island', slug: 'max-area-of-island', level: 'Medium', hints: [
            'Same as Number of Islands, but DFS returns the number of cells it visited.',
          ] },
          { title: 'Rotting Oranges', slug: 'rotting-oranges', level: 'Medium', hints: [
            'All rotten oranges spread at the same time: multi-source BFS.',
            'Queue every rotten orange first; each BFS level is one minute. Check for leftover fresh oranges.',
          ] },
          { title: 'Surrounded Regions', slug: 'surrounded-regions', level: 'Medium', hints: [
            'Think in reverse: which "O" cells survive? Those connected to the border.',
            'DFS from border "O"s to mark them safe, then flip every other "O".',
          ] },
          { title: 'Pacific Atlantic Water Flow', slug: 'pacific-atlantic-water-flow', level: 'Medium', hints: [
            'Searching from every cell is slow. Search backwards from each ocean instead.',
            'DFS from Pacific-border cells moving to equal-or-higher neighbours; same for Atlantic; answer = intersection.',
          ] },
        ],
      },
      {
        structure: 'Adjacency List',
        note: 'Build graph[u] = [neighbours] from the edge list first.',
        questions: [
          { title: 'Find if Path Exists in Graph', slug: 'find-if-path-exists-in-graph', level: 'Easy', hints: [
            'Build an adjacency list (undirected: add both directions), then BFS/DFS from source.',
          ] },
          { title: 'Number of Provinces', slug: 'number-of-provinces', level: 'Medium', hints: [
            'Provinces = connected components of the adjacency matrix.',
            'Start a DFS from each unvisited city and count the starts.',
          ] },
          { title: 'Clone Graph', slug: 'clone-graph', level: 'Medium', hints: [
            'Map original node → clone; it doubles as the visited set.',
            'DFS: create the clone, then clone each neighbour (reusing existing clones) and link them.',
          ] },
        ],
      },
      {
        structure: 'Implicit Graph',
        note: 'Nodes are states (words, combinations); edges are allowed moves.',
        questions: [
          { title: 'Open the Lock', slug: 'open-the-lock', level: 'Medium', hints: [
            'Each 4-digit combination is a node; turning one wheel by ±1 is an edge.',
            'BFS from "0000"; deadends are pre-visited nodes.',
          ] },
          { title: 'Word Ladder', slug: 'word-ladder', level: 'Hard', hints: [
            'Words are nodes; words one letter apart are connected. Shortest transformation → BFS.',
            'Generate neighbours by replacing each position with a–z and checking the word set.',
            'Remove words from the set when queued so they are not revisited.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'topological-sort',
    name: 'Topological Sort',
    phase: 3,
    tagline: 'Order tasks so every dependency comes first — and detect impossible cycles.',
    idea:
      'In a directed graph, repeatedly take nodes with in-degree 0 (nothing left that must come before them), output them, and decrease the in-degree of their neighbours (Kahn\'s algorithm). DFS post-order reversed also works.',
    why:
      'A node with in-degree 0 can safely go next because all of its prerequisites are already placed. If nodes remain but none has in-degree 0, they form a cycle, so no valid order exists.',
    cues: [
      '"Prerequisites", "dependencies", "must be done before"',
      '"Order of courses / tasks / builds", "is it possible to finish"',
      'Derive an order from pairwise comparisons (alien dictionary)',
    ],
    pitfalls: [
      'Reversing the edge direction (for [a, b] in Course Schedule, b → a)',
      'Forgetting nodes with no edges at all',
      'Not checking len(order) == n to detect a cycle',
    ],
    complexity: 'O(V + E) time and space',
    template: `from collections import defaultdict, deque
adj, indeg = defaultdict(list), [0] * n
for u, v in edges:          # u must come before v
    adj[u].append(v)
    indeg[v] += 1
q = deque(i for i in range(n) if indeg[i] == 0)
order = []
while q:
    u = q.popleft()
    order.append(u)
    for v in adj[u]:
        indeg[v] -= 1
        if indeg[v] == 0:
            q.append(v)
has_cycle = len(order) < n`,
    prereqs: ['graph-traversal'],
    groups: [
      {
        structure: 'Directed Graph',
        note: 'Edges are "comes before" relations.',
        questions: [
          { title: 'Course Schedule', slug: 'course-schedule', level: 'Medium', hints: [
            'Finishing all courses is possible iff the prerequisite graph has no cycle.',
            'Run Kahn\'s algorithm and check whether every course gets processed.',
          ] },
          { title: 'Course Schedule II', slug: 'course-schedule-ii', level: 'Medium', hints: [
            'Same as Course Schedule, but return the processing order (or [] on a cycle).',
          ] },
          { title: 'Find Eventual Safe States', slug: 'find-eventual-safe-states', level: 'Medium', hints: [
            'A node is safe if every path from it ends at a terminal node.',
            'Reverse the edges and run Kahn\'s from terminal nodes (out-degree 0); everything processed is safe.',
          ] },
          { title: 'Minimum Height Trees', slug: 'minimum-height-trees', level: 'Medium', hints: [
            'The best roots are at the centre of the tree.',
            'Peel leaves (degree 1) layer by layer, like Kahn\'s; the last 1–2 nodes remaining are the answer.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'union-find',
    name: 'Union-Find',
    phase: 3,
    tagline: 'Merge groups and ask "same group?" in near-constant time.',
    idea:
      'Each element points to a parent; the root of its chain names its group. find(x) follows parents to the root; union(a, b) attaches one root under the other. Path compression and union by rank keep the chains almost flat.',
    why:
      'With both optimisations, any sequence of operations runs in nearly O(1) each (inverse Ackermann). It suits problems where edges arrive one at a time and you only care about connectivity, not paths.',
    cues: [
      '"Connected components" while edges are being added',
      '"Redundant edge", "does this edge create a cycle" (undirected)',
      '"Merge accounts / groups", "equations that must hold together"',
    ],
    pitfalls: [
      'Comparing x and y instead of find(x) and find(y)',
      'Using union-find for directed graphs (it only models undirected connectivity)',
    ],
    complexity: 'Near O(1) per operation (α(n)), O(n) space',
    template: `parent = list(range(n))
rank = [0] * n
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]   # path compression
        x = parent[x]
    return x
def union(a, b):
    ra, rb = find(a), find(b)
    if ra == rb:
        return False                    # already connected
    if rank[ra] < rank[rb]:
        ra, rb = rb, ra
    parent[rb] = ra
    if rank[ra] == rank[rb]:
        rank[ra] += 1
    return True`,
    prereqs: ['graph-traversal'],
    groups: [
      {
        structure: 'Undirected Graph',
        note: 'Union the two ends of every edge.',
        questions: [
          { title: 'Number of Provinces (with Union-Find)', slug: 'number-of-provinces', level: 'Medium', hints: [
            'Start with n groups; every successful union reduces the count by one.',
          ] },
          { title: 'Redundant Connection', slug: 'redundant-connection', level: 'Medium', hints: [
            'Add edges in order; the first edge whose ends are already in the same group closes a cycle.',
          ] },
          { title: 'Number of Operations to Make Network Connected', slug: 'number-of-operations-to-make-network-connected', level: 'Medium', hints: [
            'Fewer than n − 1 cables → impossible.',
            'Otherwise the answer is (number of components − 1).',
          ] },
          { title: 'Accounts Merge', slug: 'accounts-merge', level: 'Medium', hints: [
            'Emails are nodes; all emails in one account are unioned together.',
            'Group emails by their root, sort each group, attach the account name.',
          ] },
          { title: 'Satisfiability of Equality Equations', slug: 'satisfiability-of-equality-equations', level: 'Medium', hints: [
            'First union every "a==b" pair.',
            'Then any "a!=b" with find(a) == find(b) is a contradiction.',
          ] },
        ],
      },
    ],
  },

  {
    id: 'dijkstra',
    name: 'Dijkstra / Weighted Shortest Path',
    phase: 3,
    tagline: 'BFS with a min-heap: always expand the closest unsettled node.',
    idea:
      'Keep the best known distance to each node. Repeatedly pop the node with the smallest distance from a min-heap and relax its edges (if going through it is shorter, update and push). Skip stale heap entries.',
    why:
      'With non-negative weights, the closest unsettled node cannot be improved later — any other route would go through nodes that are already farther away. So each pop is final, which is why negative edges break it (use Bellman-Ford there).',
    cues: [
      '"Minimum cost / time / effort / delay" on a weighted graph',
      'Non-negative edge weights',
      'Grid where moving between cells has a cost',
      'Limited number of stops → BFS by levels / Bellman-Ford instead',
    ],
    pitfalls: [
      'Not skipping entries where popped distance > best known distance',
      'Using it with negative weights',
      'Plain BFS on weighted edges (only valid when all weights are equal)',
    ],
    complexity: 'O((V + E) log V) time, O(V + E) space',
    template: `import heapq
dist = {src: 0}
pq = [(0, src)]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist.get(u, float('inf')):
        continue                         # stale entry
    for v, w in adj[u]:
        nd = d + w
        if nd < dist.get(v, float('inf')):
            dist[v] = nd
            heapq.heappush(pq, (nd, v))`,
    prereqs: ['graph-traversal', 'heap'],
    groups: [
      {
        structure: 'Weighted Graph',
        note: 'Adjacency list of (neighbour, weight).',
        questions: [
          { title: 'Network Delay Time', slug: 'network-delay-time', level: 'Medium', hints: [
            'Time for all nodes to receive the signal = the largest shortest distance from k.',
            'Run Dijkstra from k; if any node is unreachable, return −1.',
          ] },
          { title: 'Path with Maximum Probability', slug: 'path-with-maximum-probability', level: 'Medium', hints: [
            'Same idea with "maximise a product": use a max-heap (push −probability).',
          ] },
          { title: 'Cheapest Flights Within K Stops', slug: 'cheapest-flights-within-k-stops', level: 'Medium', hints: [
            'The stop limit breaks plain Dijkstra: a cheaper path may use too many stops.',
            'Bellman-Ford for k + 1 rounds, relaxing from a copy of the previous round\'s prices.',
          ] },
        ],
      },
      {
        structure: 'Grid',
        note: 'Cells are nodes; the cost of a path is a sum or a maximum.',
        questions: [
          { title: 'Path With Minimum Effort', slug: 'path-with-minimum-effort', level: 'Medium', hints: [
            'The cost of a path is its largest single step, not a sum.',
            'Dijkstra still works: the new distance is max(current effort, step difference).',
          ] },
          { title: 'Swim in Rising Water', slug: 'swim-in-rising-water', level: 'Hard', hints: [
            'You need the path whose highest cell is as low as possible.',
            'Min-heap by elevation: always expand the lowest reachable cell; track the max seen.',
          ] },
        ],
      },
    ],
  },
]
