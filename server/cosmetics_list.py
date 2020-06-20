from flask import jsonify, request
import numpy as np 
import pandas as pd
from server.data import df
from math import ceil
from functools import reduce

def cosmetics_list():
	raw_filters = [
		label_filter(), 
		brand_filter(), 
		min_price_filter(), 
		max_price_filter(), 
		rating_filter(), 
		combination_filter(), 
		dry_filter(),
		normal_filter(),
		oily_filter(),
		sensitive_filter()
	]
	all_elements = np.array([True for i in df.iterrows()])
	filters = reduce(lambda a, b: a&b, (_filter for _filter in raw_filters if _filter is not None), all_elements)
	page_size = 50
	page = page_num()
	sort, direction = sort_direction()
	data_drop = df.drop(['ingredients', 'x', 'y'], axis=1)
	data_filter = data_drop.loc[filters]
	data_sort = data_filter.sort_values(by=sort, ascending=direction)
	data_page = data_sort.iloc[page * page_size: (page * page_size) + page_size]
	return jsonify({'data': data_page.to_dict('records'), 'meta':{'pages': ceil(len(data_sort)/page_size), 'page_size': page_size, 'size': len(data_sort)}})


def label_filter():
	category_name = request.args.get('label', '', str)
	if category_name:
		return df['category'] == category_name


def brand_filter():
	brand_name = request.args.get('brand', '', str)
	if brand_name:
		return df['brand'] == brand_name


def min_price_filter():
	min_price = request.args.get('min-price', 0, int)
	if min_price:
		return df['price'] >= min_price


def max_price_filter():
	max_price = request.args.get('max-price', float('inf'), int)
	print(max_price)
	if max_price:
		return df['price'] <= max_price


def rating_filter():
	rating =  request.args.get('rating', 1, int)
	if rating:
		return df['rating'] >= rating


boolean_params = {'': True, 'true': True, 'false': False}

def boolean_param(param):
	return boolean_params.get(param, None)

def combination_filter():
	combination = request.args.get('combination', None, boolean_param)
	return df['combination'] == combination if combination is not None else None

def dry_filter():
	combination = request.args.get('dry', None, boolean_param)
	return df['dry'] == combination if combination is not None else None


def normal_filter():
	combination = request.args.get('normal', None, boolean_param)
	return df['normal'] == combination if combination is not None else None

def oily_filter():
	combination = request.args.get('oily', None, boolean_param)
	return df['oily'] == combination if combination is not None else None


def sensitive_filter():
	combination = request.args.get('sensitive', None, boolean_param)
	return df['sensitive'] == combination if combination is not None else None


def sort_direction():
	sort = request.args.get('sort', 'name', str)
	ascending =  request.args.get('ascending', None, str)
	if ascending in boolean_params:
		return (sort, boolean_params[ascending])
	else:
		return (sort, True)

def page_num():
	page= request.args.get('page', 0, int)
	return page

