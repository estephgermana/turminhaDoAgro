const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017';
const dbName = 'TurminhaDoAgro';
const collectionName = 'products';
const cartCollectionName = 'carrinho';


const newId = new ObjectId();

app.use(bodyParser.json());

// Rota para adicionar um produto
app.post('/api/products', async (req, res) => {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const result = await collection.insertOne(req.body);
        res.json({ message: "Produto adicionado com sucesso", productId: result.insertedId });
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        await client.close();
    }
});

// Rota para excluir um produto
app.delete('/api/products/:id', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) });

        if (result.deletedCount === 1) {
            res.json({ message: "Produto excluído com sucesso" });
        } else {
            res.status(404).json({ error: "Produto não encontrado" });
        }
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


// Rota para listar todos os produtos
app.get('/api/products', async (req, res) => {
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const products = await collection.find({}).toArray();
        res.json(products);
    } catch (error) {
        console.error('Erro ao listar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        await client.close();
    }
});

// Rota para editar um produto
app.put('/api/products/:id', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const productId = req.params.id;
        const updatedProduct = req.body;

        const result = await collection.findOneAndUpdate(
            { _id: new ObjectId(productId) },
            { $set: updatedProduct },
            { returnOriginal: false }
        );

        const updatedDocument = await collection.findOne({ _id: new ObjectId(productId) });

        if (updatedDocument) {
            res.status(200).json({ message: "Produto atualizado com sucesso", updatedProduct: updatedDocument });
        } else {
            res.status(404).json({ error: "Produto não encontrado após edição" });
        }
    } catch (error) {
        console.error('Erro ao editar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


// carrinho:
// Adicionar Item ao Carrinho
app.post('/api/cart/add', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const productsCollectionName = 'products';
        const database = client.db(dbName);
        const productsCollection = database.collection(productsCollectionName);
        const cartCollection = database.collection(cartCollectionName);
        const { productId, quantity } = req.body;

        // Verifica se o produto existe no estoque
        const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
        if (!product) {
            return res.status(404).json({ error: "Produto não encontrado no estoque" });
        }

        // Verifica se há estoque suficiente
        if (product.stock < quantity) {
            return res.status(400).json({ error: "Estoque insuficiente" });
        }

        // Adiciona o item ao carrinho
        await cartCollection.insertOne({ productId, quantity });

        res.json({ message: "Produto adicionado ao carrinho com sucesso" });
    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


// Visualizar Carrinho
app.get('/api/cart', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const productsCollectionName = 'products';
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);
        const productsCollection = database.collection(productsCollectionName);

        const items = await cartCollection.find({}).toArray();
        const cart = [];

        for (const item of items) {
            const product = await productsCollection.findOne({ _id: new ObjectId(item.productId) });
            cart.push({ 
                productId: item.productId, 
                name: product.name,
                price: product.price,
                quantity: item.quantity
            });
        }

        res.json(cart);
    } catch (error) {
        console.error('Erro ao visualizar carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Remover Item do Carrinho
app.delete('/api/cart/remove/:productId', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);

        const result = await cartCollection.deleteOne({ productId: req.params.productId });

        if (result.deletedCount === 1) {
            res.json({ message: "Item removido do carrinho com sucesso" });
        } else {
            res.status(404).json({ error: "Item não encontrado no carrinho" });
        }
    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar Quantidade do Item no Carrinho
app.put('/api/cart/update/:productId', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);

        const { quantity } = req.body;

        const result = await cartCollection.updateOne(
            { productId: req.params.productId },
            { $set: { quantity } }
        );

        if (result.modifiedCount === 1) {
            res.json({ message: "Quantidade do item atualizada com sucesso" });
        } else {
            res.status(404).json({ error: "Item não encontrado no carrinho" });
        }
    } catch (error) {
        console.error('Erro ao atualizar quantidade do item no carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para concluir uma venda
app.post('/api/sales/complete', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const productsCollectionName = 'products';
        const salesCollection = database.collection('sales');
        const productsCollection = database.collection(productsCollectionName);
        const cartCollection = database.collection(cartCollectionName);
        const items = await cartCollection.find({}).toArray();

        if (items.length === 0) {
            return res.status(400).json({ error: "Carrinho vazio. Não é possível concluir a venda." });
        }

        const saleDetails = []; 

        for (const item of items) {
            const product = await productsCollection.findOne({ _id: new ObjectId(item.productId) });

 
            if (!product) {
                return res.status(404).json({ error: "Produto não encontrado no estoque" });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` });
            }

            
            await productsCollection.updateOne(
                { _id: new ObjectId(item.productId) },
                { $inc: { stock: -item.quantity } } 
            );

            saleDetails.push({
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                price: product.price * item.quantity 
            });
        }

        const sale = {
            timestamp: new Date(),
            items: saleDetails
        };
        const result = await salesCollection.insertOne(sale);
        await cartCollection.deleteMany({});

        res.json({ message: "Venda concluída com sucesso", saleId: result.insertedId });
    } catch (error) {
        console.error('Erro ao concluir a venda:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


app.listen(port, () => {
    console.log(`Servidor iniciado na porta ${port}`);
});
