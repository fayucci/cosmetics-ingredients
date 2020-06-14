from flask import request, Response
from server.data import df
import numpy as np

def cosmetic():
    id = request.args.get('id', type=int)
    row = df.loc[id]
    row['ingredients'] = row['ingredients'].split(', ')
    row['similars'] = df[(df['x'] >= row['x']-1) & (df['x'] <= row['x']+1) & (df['y'] >= row['y']-1) & (df['y'] <= row['y']+1)].drop(['ingredients', 'x', 'y']).to_dict('records')
    return Response(row.to_json(), mimetype='application/json')