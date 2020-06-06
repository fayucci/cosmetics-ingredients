from flask import jsonify, request
import numpy as np 
import pandas as pd



df = pd.read_csv('datasets/cosmetics.csv', dtype={
	'combination': 'bool',
	'dry': 'bool',
	'normal':'bool',
	'oily': 'bool',
	'sensitive': 'bool'
	}, names=['label', 'brand', 'name', 'price', 'rank', 'ingredients', 'combination', 'dry', 'normal', 'oily', 'sensitive'], header=0)


df['id'] = df.index

def cosmetics_list():
	df_dict = df.loc[brand_filter()].to_dict('records')
	return jsonify(df_dict)


#labels = df['label'].unique().tolist()
#print(labels)
# brands = df['brand'].unique().tolist()
# print(brands)
# max_price = df['price'].max()
# print(max_price)
# min_price = df['price'].min()
# print(min_price)

all = [True for i in df.iterrows()]

def brand_filter():
	brand_name = request.args.get('brand', '', str)
	if brand_name:
		return df['brand'] == brand_name
	else:
		return all

