interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo = ({ size = 'md', className = '' }: LogoProps) => {
  const sizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="https://securifyai.co/wp-content/uploads/2024/09/securify-logo-light.png" 
        alt="Securify Logo" 
        className={sizes[size]}
      />
    </div>
  );
};

export default Logo;