import { createAuthController } from './controllers/auth.controller.js';
import { createBrandsController } from './controllers/brands.controller.js';
import { createCategoriesController } from './controllers/categories.controller.js';
import { createHealthController } from './controllers/health.controller.js';
import { createMeController } from './controllers/me.controller.js';
import { createProductsController } from './controllers/products.controller.js';
import { createUsersController } from './controllers/users.controller.js';
import { createPrismaClient } from './db/prisma.js';
import { createAuthenticate, createAuthenticateOptional } from './middleware/authenticate.js';
import { createAddressRepository } from './repositories/address.repository.js';
import { createBrandRepository } from './repositories/brand.repository.js';
import { createCategoryRepository } from './repositories/category.repository.js';
import { createProductRepository } from './repositories/product.repository.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createAddressService } from './services/address.service.js';
import { createAuthService } from './services/auth.service.js';
import { createBrandService } from './services/brand.service.js';
import { createCategoryService } from './services/category.service.js';
import { createProductService } from './services/product.service.js';
import { createUserService } from './services/user.service.js';

// Composition root: prisma - repositories - services - controllers.
export function createContainer() {
  const prisma = createPrismaClient();

  const userRepository = createUserRepository({ prisma });
  const addressRepository = createAddressRepository({ prisma });
  const productRepository = createProductRepository({ prisma });
  const categoryRepository = createCategoryRepository({ prisma });
  const brandRepository = createBrandRepository({ prisma });

  const authService = createAuthService({ userRepository });
  const userService = createUserService({ userRepository });
  const addressService = createAddressService({ addressRepository, userRepository, prisma });
  const productService = createProductService({ productRepository });
  const categoryService = createCategoryService({ categoryRepository });
  const brandService = createBrandService({ brandRepository });

  return {
    prisma,
    authenticate: createAuthenticate({ authService }),
    authenticateOptional: createAuthenticateOptional({ authService }),
    authController: createAuthController({ authService }),
    meController: createMeController({ userService, authService, addressService }),
    usersController: createUsersController({ userService }),
    productsController: createProductsController({ productService }),
    categoriesController: createCategoriesController({ categoryService }),
    brandsController: createBrandsController({ brandService }),
    healthController: createHealthController({ prisma }),
  };
}
