import {UnauthorizedException} from '@nestjs/common';

const checkAuthHeader = (header: string) => {
	if (!header.startsWith('Bearer ')) {
		throw new UnauthorizedException();
	}

	const token = header.split('Bearer ')[1];

	if (token !== process.env.AUTH_TOKEN) {
		throw new UnauthorizedException();
	}
};

export default checkAuthHeader;
