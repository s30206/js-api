import { createAuthController } from './controllers/auth.controller.js';
import { createHealthController } from './controllers/health.controller.js';
import { createMeController } from './controllers/me.controller.js';
import { createProductsController } from './controllers/products.controller.js';
import { createUsersController } from './controllers/users.controller.js';
import { createPool } from './db/pool.js';
import { createWithTransaction } from './db/transaction.js';
import { createAuthenticate, createAuthenticateOptional } from './middleware/authenticate.js';
import { createAddressRepository } from './repositories/address.repository.js';
import { createProductRepository } from './repositories/product.repository.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createAddressService } from './services/address.service.js';
import { createAuthService } from './services/auth.service.js';
import { createProductService } from './services/product.service.js';
import { createUserService } from './services/user.service.js';

// Composition root: pool - repositories - services - controllers.
export function createContainer() {
  const pool = createPool();
  const withTransaction = createWithTransaction({ pool });

  const userRepository = createUserRepository({ pool });
  const addressRepository = createAddressRepository({ pool });
  const productRepository = createProductRepository({ pool });

  const authService = createAuthService({ userRepository });
  const userService = createUserService({ userRepository });
  const addressService = createAddressService({ addressRepository, userRepository, withTransaction });
  const productService = createProductService({ productRepository });

  return {
    pool,
    authenticate: createAuthenticate({ authService }),
    authenticateOptional: createAuthenticateOptional({ authService }),
    authController: createAuthController({ authService }),
    meController: createMeController({ userService, authService, addressService }),
    usersController: createUsersController({ userService }),
    productsController: createProductsController({ productService }),
    healthController: createHealthController({ pool }),
  };
}
