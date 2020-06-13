from flask import request, Response
from server.data import df
import numpy as np

def cosmetic():
    id = request.args.get('id', type=int)
    row = df.loc[id]
    p1 = np.array([row['x'], row['y']]).reshape(1, -1)
    for i in range(len(df)):
        p2 = np.array([df['x'][i], df['y'][i]]).reshape(-1, 1)
        df.dist[i] = (p1 * p2).sum() / (np.sqrt(np.sum(p1 ** 2))*np.sqrt(np.sum(p2 ** 2)))
    row['ingredients'] = row['ingredients'].split(', ')
    row['similars'] = df.sort_values('dist').head().drop(['ingredients','x', 'y', 'dist'], axis=1).to_dict('records')
    
    return Response(row.to_json(), mimetype='application/json')


