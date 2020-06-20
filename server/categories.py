from flask import jsonify
from server.data import df

def categories():
    return jsonify(df['category'].unique().tolist())