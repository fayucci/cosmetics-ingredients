from flask import request, Response
from server.data import df

def cosmetic():
    id = request.args.get('id', type=int)
    return Response(df.iloc[id].to_json(), mimetype='application/json')

