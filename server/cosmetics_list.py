from flask import jsonify
import numpy as np 
import pandas as pd



df = pd.read_csv('datasets/cosmetics.csv')

df['id'] = df.index

df_dict = df.to_dict('records')

def cosmetics_list():
	return jsonify(df_dict)
	