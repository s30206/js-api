import { createAuthController } from './controllers/auth.controller.js';
import { createHealthController } from './controllers/health.controller.js';
import { createMeController } from './controllers/me.controller.js';
import { createPool } from './db/pool.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createAuthService } from './services/auth.service.js';
import { createUserService } from './services/user.service.js';

// Composition root: pool → repositories → services → controllers.
export function createContainer() {
  const pool = createPool();

  const userRepository = createUserRepository({ pool });

  const authService = createAuthService({ userRepository });
  const userService = createUserService({ userRepository });

  return {
    pool,
    authenticate: createAuthenticate({ authService }),
    authController: createAuthController({ authService }),
    meController: createMeController({ userService }),
    healthController: createHealthController({ pool }),
  };
}
