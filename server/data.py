import pandas as pd

df = pd.read_csv('datasets/cosmetics.csv', dtype={
	'combination': 'bool',
	'dry': 'bool',
	'normal':'bool',
	'oily': 'bool',
	'sensitive': 'bool'
	}, names=['label', 'brand', 'name', 'price', 'rank', 'ingredients', 'combination', 'dry', 'normal', 'oily', 'sensitive'], header=0)


df['id'] = df.index

df = (df.loc[df['ingredients'] != 'No Info'])

df['brand'] = df['brand'].str.replace("KIEHL'S SINCE 1851", "KIEHL'S")


labels = df['label'].unique().tolist()

brands = df['brand'].unique().tolist()

max_price = df['price'].max()

min_price = df['price'].min()


print(type(df.iloc[12].to_dict().get("combination")))