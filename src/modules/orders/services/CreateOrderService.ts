import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if(!customer) {
      throw new AppError('Customer was not found', 400);
    }

    const productExists = await this.productsRepository.findAllById(products.map(product => ({
      id: product.id
    })));

    if(productExists.length !== products.length) {
      throw new AppError('Some product was not found', 400);
    }

    products.forEach(product => {
      const qty = productExists.find(p => p.id === product.id)?.quantity;

      if((qty || 0) < product.quantity) {
        throw new AppError('Product does not have available quantity');
      }
    })

    const order = await this.ordersRepository.create({
      customer,
      products: products.map(product => ({
        product_id: product.id,
        quantity: product.quantity,
        price: productExists.find(p => p.id === product.id)?.price || 0
      }))
    })

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
