# Mind your cosmetics

Here you can find a Flask app that will allow you to visualize the cosmetic ingredients and find similars products.

You can see it runnig [here](https://cosmetics-ingredients.herokuapp.com/)

You can explore the list of products with differents filters like whether brand, category, rating, price and type of skin.

You can also sort the cosmetics by name, rating and price.

Inspecting each product you can see a bar plot of the ingredients and you can scroll-zoom on the ingredients, and if you click on one of it will google it

In this app I made a document-term matriz (DTM) from a list of cosmetics (source:DataCamp), and used a machine learning method called t-SNE for reducing the dimensions of this matrix and find the similars products based from the features of the t-SNE. 

**An important note**, the proportion of ingredients in each product is just a visual reference. Which relies on the assumption that the ingredient list is sorted from high to low concentration; this commonly required by law.

