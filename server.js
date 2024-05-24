const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const cors = require('cors'); 
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017';
const dbName = 'TurminhaDoAgro';
const collectionName = 'products';
const cartCollectionName = 'carrinho';
const userCollectionName = 'user';

const client = new MongoClient(uri, { useUnifiedTopology: true });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Ativando o CORS

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'estephani.germana@gmail.com',
        pass: 'tdup byzz bnbe regj'
    }
});


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

// Rota para visualizar todos os usuários
app.get('/api/users', async (req, res) => {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(userCollectionName);

        // Encontrar todos os usuários na coleção
        const users = await collection.find({}).toArray();

        // Retorna a lista de usuários
        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        await client.close();
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
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db(dbName);
        const productsCollection = database.collection(collectionName);
        const cartCollection = database.collection(cartCollectionName);
        const { userId, productId, quantity } = req.body;

        // Validação de Entrada
        if (!ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ error: "Dados inválidos" });
        }

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
        await cartCollection.insertOne({ userId: new ObjectId(userId), productId: new ObjectId(productId), quantity });

        res.json({ message: `Produto adicionado ao carrinho do ${userId} com sucesso` });
    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        await client.close();
    }
});

// Visualizar Carrinho do Usuário
app.get('/api/cart/:userId', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);
        const productsCollection = database.collection(collectionName);

        const userId = req.params.userId;

        // Busca todos os itens do carrinho do usuário
        const items = await cartCollection.find({ userId: new ObjectId(userId) }).toArray();
        const cart = [];

        for (const item of items) {
            const product = await productsCollection.findOne({ _id: new ObjectId(item.productId) });
            if (product) {
                cart.push({
                    productId: item.productId,
                    name: product.name,
                    price: product.price,
                    quantity: item.quantity
                });
            } else {
                console.error(`Produto com ID ${item.productId} não encontrado no estoque.`);
            }
        }

        res.json(cart);
    } catch (error) {
        console.error('Erro ao visualizar carrinho do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Remover Quantidade Específica do Item do Carrinho do Usuário
app.delete('/api/cart/remove/:userId/:productId', async (req, res) => {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);
        const { userId, productId } = req.params;
        const { quantityToRemove } = req.query; // Obter a quantidade a ser removida

        // Verificar se a quantidade a ser removida é válida
        if (!quantityToRemove || isNaN(quantityToRemove) || quantityToRemove <= 0) {
            return res.status(400).json({ error: "Quantidade inválida a ser removida" });
        }

        // Verificar se o item está no carrinho
        const item = await cartCollection.findOne({ userId: new ObjectId(userId), productId: new ObjectId(productId) });
        if (!item) {
            return res.status(404).json({ error: "Item não encontrado no carrinho" });
        }

        // Calcular a nova quantidade após a remoção
        const newQuantity = item.quantity - parseInt(quantityToRemove, 10);

        // Se a nova quantidade for menor ou igual a zero, remover o item do carrinho
        if (newQuantity <= 0) {
            await cartCollection.deleteOne({ userId: new ObjectId(userId), productId: new ObjectId(productId) });
        } else {
            await cartCollection.updateOne(
                { userId: new ObjectId(userId), productId: new ObjectId(productId) },
                { $set: { quantity: newQuantity } }
            );
        }

        res.json({ message: `Quantidade removida do carrinho com sucesso para o produto ${productId}` });
    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para concluir uma venda para um usuário específico
app.post('/api/sales/complete/:userId', async (req, res) => {
    const { userId } = req.params;
    const { paymentMethod } = req.body;

    try {
        await client.connect();
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);
        const productsCollection = database.collection(collectionName);
        const salesCollection = database.collection('sales');
        const userCollection = database.collection(userCollectionName);

        // Busca todos os itens do carrinho do usuário específico
        const items = await cartCollection.find({ userId: new ObjectId(userId) }).toArray();

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

            // Atualiza o estoque do produto
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

        // Registra a venda no banco de dados
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });

        const sale = {
            userId: new ObjectId(userId),
            userName: user.nome,
            userEmail: user.email,
            timestamp: new Date(),
            items: saleDetails,
            paymentMethod: paymentMethod
        };

        const result = await salesCollection.insertOne(sale);
        await cartCollection.deleteMany({ userId: new ObjectId(userId) });

        // Mensagem de confirmação da compra para o Postman
        const postmanMessage = `Olá ${user.nome}, Sua compra foi realizada com sucesso. Detalhes da compra: ${saleDetails.map(item => `${item.productName}, R$${item.price.toFixed(2)}, Pagamento: ${paymentMethod}`).join('\n')}Obrigado por comprar com a TurminhaDoAgro!`;

        // Mensagem de confirmação da compra para o Email
        const emailMessage = `Olá ${user.nome}, espero que esteja bem!!\n\nSua compra foi realizada com sucesso! Já vamos preparar seu pedido para envio.\n\nDetalhes da compra:\nVocê adquiriu o(s) produto(s):\n${saleDetails.map(item => `${item.productName}`).join(', ')}\nValor: R$${saleDetails.reduce((acc, item) => acc + item.price, 0).toFixed(2)}\nMétodo de Pagamento: ${paymentMethod}\n\nObrigado por comprar com a TurminhaDoAgro!`;

        // Configuração do email
        const mailOptions = {
            from: 'turminhadoagro9@gmail.com',
            to: user.email,
            subject: 'Confirmação de Compra - TurminhaDoAgro',
            text: emailMessage
        };

        // Envia o email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erro ao enviar email:', error);
                return res.status(500).json({ error: 'Erro ao enviar email de confirmação' });
            } else {
                console.log('Email enviado:', info.response);
                res.json({
                    message: postmanMessage,
                    saleId: result.insertedId
                });
            }
        });
    } catch (error) {
        console.error('Erro ao concluir a venda:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para obter o histórico de compras de um usuário
app.get('/api/sales/history/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await client.connect();
        const database = client.db(dbName);
        const salesCollection = database.collection('sales');

        // Busca todas as vendas do usuário específico
        const sales = await salesCollection.find({ userId: new ObjectId(userId) }).toArray();

        // Formata os detalhes da venda
        const salesHistory = sales.map(sale => ({
            saleId: sale._id.toString(),
            timestamp: sale.timestamp.toLocaleString(),
            items: sale.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                status: 'Enviado'
            })),
            paymentMethod: sale.paymentMethod
        }));

        res.json(salesHistory);
    } catch (error) {
        console.error('Erro ao obter o histórico de compras:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } 
});

// USUARIOS
// Rota para visualizar todos os usuários
app.get('/api/users', async (req, res) => {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(userCollectionName);
        const users = await collection.find({}).toArray();
        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        await client.close();
    }
});

// Endpoint para cadastrar um usuário
app.post('/api/cadastro', async (req, res) => {
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(userCollectionName);

        const { nome, email, senha } = req.body;

        // Verifica se o usuário já existe pelo e-mail
        const existingUser = await collection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }

        // Insere o novo usuário
        const result = await collection.insertOne({ nome, email, senha });
        res.status(201).json({ message: 'Usuário cadastrado com sucesso', userId: result.insertedId });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

//login
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        }

        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(userCollectionName);

        const user = await collection.findOne({ email });

        if (!user || user.senha !== senha) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }

        res.status(200).json({ message: 'Login bem-sucedido', nome: user.nome });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});


app.listen(port, () => {
    console.log(`Servidor iniciado na porta ${port}`);
});
