import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { CpuArchitecture } from '@/components/ui/cpu-architecture';

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

function Pupil({
  size = 12,
  maxDistance = 5,
  pupilColor = 'black',
  forceLookX,
  forceLookY,
}: PupilProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;
    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
}

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

function EyeBall({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = 'white',
  pupilColor = 'black',
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;
    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
}

export interface AnimatedCharactersPanelProps {
  appName: string;
  /** Primary password field driving peek / height animations (login password or “new password”). */
  password: string;
  showPassword: boolean;
  /** True while username or any password field is focused. */
  isTyping: boolean;
}

/** Left column: illustrated characters reacting to pointer, typing, and password visibility. */
export function AnimatedCharactersPanel({
  appName,
  password,
  showPassword,
  isTyping,
}: AnimatedCharactersPanelProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIsPurpleBlinking(true);
      window.setTimeout(() => setIsPurpleBlinking(false), 150);
    }, 4500 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIsBlackBlinking(true);
      window.setTimeout(() => setIsBlackBlinking(false), 150);
    }, 5200 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(timer);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (!(password.length > 0 && showPassword)) {
      setIsPurplePeeking(false);
      return;
    }
    const id = window.setInterval(() => {
      setIsPurplePeeking(true);
      setTimeout(() => setIsPurplePeeking(false), 800);
    }, 4000 + Math.random() * 1500);
    return () => clearInterval(id);
  }, [password, showPassword]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));
    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <div className="relative hidden min-h-[50vh] flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-8 text-primary-foreground lg:flex lg:min-h-screen lg:p-12">
      <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center opacity-[0.22] mix-blend-screen">
        <CpuArchitecture text="SV" className="max-h-[min(420px,50vh)] w-full max-w-[520px] text-primary-foreground/40" />
      </div>
      <div className="relative z-20">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span>{appName}</span>
        </div>
      </div>

      <div className="relative z-20 flex h-[420px] items-end justify-center lg:h-[500px]">
        <div className="relative" style={{ width: '550px', height: '400px' }}>
          <div
            ref={purpleRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '70px',
              width: '180px',
              height: isTyping || (password.length > 0 && !showPassword) ? '440px' : '400px',
              backgroundColor: '#6C3FF5',
              borderRadius: '10px 10px 0 0',
              zIndex: 1,
              transform:
                password.length > 0 && showPassword
                  ? 'skewX(0deg)'
                  : isTyping || (password.length > 0 && !showPassword)
                    ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                    : `skewX(${purplePos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className="absolute flex gap-8 transition-all duration-700 ease-in-out"
              style={{
                left:
                  password.length > 0 && showPassword
                    ? 20
                    : isLookingAtEachOther
                      ? 55
                      : 45 + purplePos.faceX,
                top:
                  password.length > 0 && showPassword
                    ? 35
                    : isLookingAtEachOther
                      ? 65
                      : 40 + purplePos.faceY,
              }}
            >
              <EyeBall
                size={18}
                pupilSize={7}
                maxDistance={5}
                eyeColor="white"
                pupilColor="#2D2D2D"
                isBlinking={isPurpleBlinking}
                forceLookX={
                  password.length > 0 && showPassword
                    ? isPurplePeeking
                      ? 4
                      : -4
                    : isLookingAtEachOther
                      ? 3
                      : undefined
                }
                forceLookY={
                  password.length > 0 && showPassword
                    ? isPurplePeeking
                      ? 5
                      : -4
                    : isLookingAtEachOther
                      ? 4
                      : undefined
                }
              />
              <EyeBall
                size={18}
                pupilSize={7}
                maxDistance={5}
                eyeColor="white"
                pupilColor="#2D2D2D"
                isBlinking={isPurpleBlinking}
                forceLookX={
                  password.length > 0 && showPassword
                    ? isPurplePeeking
                      ? 4
                      : -4
                    : isLookingAtEachOther
                      ? 3
                      : undefined
                }
                forceLookY={
                  password.length > 0 && showPassword
                    ? isPurplePeeking
                      ? 5
                      : -4
                    : isLookingAtEachOther
                      ? 4
                      : undefined
                }
              />
            </div>
          </div>

          <div
            ref={blackRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '240px',
              width: '120px',
              height: '310px',
              backgroundColor: '#2D2D2D',
              borderRadius: '8px 8px 0 0',
              zIndex: 2,
              transform:
                password.length > 0 && showPassword
                  ? 'skewX(0deg)'
                  : isLookingAtEachOther
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                    : isTyping || (password.length > 0 && !showPassword)
                      ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                      : `skewX(${blackPos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-700 ease-in-out"
              style={{
                left:
                  password.length > 0 && showPassword ? 10 : isLookingAtEachOther ? 32 : 26 + blackPos.faceX,
                top:
                  password.length > 0 && showPassword ? 28 : isLookingAtEachOther ? 12 : 32 + blackPos.faceY,
              }}
            >
              <EyeBall
                size={16}
                pupilSize={6}
                maxDistance={4}
                eyeColor="white"
                pupilColor="#2D2D2D"
                isBlinking={isBlackBlinking}
                forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
              />
              <EyeBall
                size={16}
                pupilSize={6}
                maxDistance={4}
                eyeColor="white"
                pupilColor="#2D2D2D"
                isBlinking={isBlackBlinking}
                forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
              />
            </div>
          </div>

          <div
            ref={orangeRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '0px',
              width: '240px',
              height: '200px',
              zIndex: 3,
              backgroundColor: '#FF9B6B',
              borderRadius: '120px 120px 0 0',
              transform: password.length > 0 && showPassword ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className="absolute flex gap-8 transition-all duration-200 ease-out"
              style={{
                left: password.length > 0 && showPassword ? 50 : 82 + (orangePos.faceX || 0),
                top: password.length > 0 && showPassword ? 85 : 90 + (orangePos.faceY || 0),
              }}
            >
              <Pupil
                size={12}
                maxDistance={5}
                pupilColor="#2D2D2D"
                forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                forceLookY={password.length > 0 && showPassword ? -4 : undefined}
              />
              <Pupil
                size={12}
                maxDistance={5}
                pupilColor="#2D2D2D"
                forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                forceLookY={password.length > 0 && showPassword ? -4 : undefined}
              />
            </div>
          </div>

          <div
            ref={yellowRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '310px',
              width: '140px',
              height: '230px',
              backgroundColor: '#E8D754',
              borderRadius: '70px 70px 0 0',
              zIndex: 4,
              transform: password.length > 0 && showPassword ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-200 ease-out"
              style={{
                left: password.length > 0 && showPassword ? 20 : 52 + (yellowPos.faceX || 0),
                top: password.length > 0 && showPassword ? 35 : 40 + (yellowPos.faceY || 0),
              }}
            >
              <Pupil
                size={12}
                maxDistance={5}
                pupilColor="#2D2D2D"
                forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                forceLookY={password.length > 0 && showPassword ? -4 : undefined}
              />
              <Pupil
                size={12}
                maxDistance={5}
                pupilColor="#2D2D2D"
                forceLookX={password.length > 0 && showPassword ? -5 : undefined}
                forceLookY={password.length > 0 && showPassword ? -4 : undefined}
              />
            </div>
            <div
              className="absolute h-1 w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
              style={{
                left: password.length > 0 && showPassword ? 10 : 40 + (yellowPos.faceX || 0),
                top: password.length > 0 && showPassword ? 88 : 88 + (yellowPos.faceY || 0),
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-20 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/60">
        <span className="opacity-80">ServerVault</span>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[length:20px_20px] opacity-[0.07] [background-image:linear-gradient(to_right,hsl(0_0%_100%/_0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0_0%_100%/_0.15)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-96 w-96 rounded-full bg-primary-foreground/5 blur-3xl" />
    </div>
  );
}

export interface AnimatedAuthShellProps extends AnimatedCharactersPanelProps {
  children: React.ReactNode;
}

/** Two-column layout: animated characters (lg+) + form area. */
export function AnimatedAuthShell({ appName, password, showPassword, isTyping, children }: AnimatedAuthShellProps) {
  return (
    <div className="min-h-[100dvh] bg-bg lg:grid lg:min-h-screen lg:grid-cols-2">
      <AnimatedCharactersPanel
        appName={appName}
        password={password}
        showPassword={showPassword}
        isTyping={isTyping}
      />
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-bg px-4 py-10 sm:px-8 sm:py-12 lg:min-h-0 lg:py-14">
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.09] dark:opacity-[0.14]">
          <CpuArchitecture text="CPU" animateText={false} className="h-full min-h-[280px] w-full text-muted-foreground/50 dark:text-muted-foreground/35" />
        </div>
        <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center justify-center gap-0">{children}</div>
      </div>
    </div>
  );
}
